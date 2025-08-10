import { Atom, subscribe } from "@rbxts/charm";
import { produce } from "@rbxts/immut";
import { KeyframeSequenceProvider } from "@rbxts/services";
import { AnimationData, AnimationEvent } from "../types";
import { AnimationTracker } from "./animation-tracker";

/**
 * Manages animations on the server-side, handling their loading, tracking, and synchronization
 * of their state with a shared Atom. It acts as the central authority for animation data
 * that will be replicated to clients.
 */
export class ServerAnimator {
	private static cachedAnimations: Map<
		string,
		{
			Config: AnimationData["Config"];
			Priority: Enum.AnimationPriority;
			Looped: boolean;
		}
	> = new Map();
	private tracks: Map<string, AnimationTracker> = new Map();

	constructor(private atom: Atom<Map<string, AnimationData>>) {}

	private createTrack(animationData: AnimationData, id: string) {
		const newTrack = new AnimationTracker(animationData);
		const connection = subscribe(newTrack.Atom, (newState) => {
			if (!newState) {
				this.tracks.delete(animationData.Name);
				connection?.();
				this.atom(
					produce(this.atom(), (draft) => {
						draft.delete(id);
					}),
				);

				return;
			}

			this.atom(
				produce(this.atom(), (draft) => {
					draft.set(id, {
						Name: animationData.Name,
						Id: id,
						Config: animationData.Config,
						State: newState,
					});
				}),
			);
		});

		this.tracks.set(id, newTrack);
		return newTrack;
	}

	private createAnimationState(priority: Enum.AnimationPriority, looped: boolean): AnimationData["State"] {
		return {
			IsPlaying: false,
			PassedProgress: 0,
			StartTime: 0,
			EndTime: 0,
			Weight: 1,
			FadeTime: 0.100000001,
			Speed: 1,
			Priority: priority,
			Looped: looped,
		};
	}

	public GetAnimation(id: string) {
		return this.tracks.get(id);
	}

	/**
	 * Loads an animation and creates a new track for it. The animation state is stored in a shared Atom,
	 * and the track is returned.
	 * @param animation The animation to load.
	 * @returns A new AnimationTracker instance for the loaded animation
	 */
	public async LoadAnimation(animation: Animation) {
		const id = typeIs(animation, "string") ? animation : animation.AnimationId;
		if (ServerAnimator.cachedAnimations.has(id)) {
			const cached = ServerAnimator.cachedAnimations.get(id)!;

			const data: AnimationData = {
				Name: animation.Name,
				Id: id,
				Config: cached.Config,
				State: this.createAnimationState(cached.Priority, cached.Looped),
			};

			this.atom(
				produce(this.atom(), (draft) => {
					draft.set(id, data);
				}),
			);

			return this.createTrack(data, id);
		}

		const animationSource = KeyframeSequenceProvider.GetKeyframeSequenceAsync(id);

		const events: AnimationEvent[] = [];
		let lenght = 0;

		animationSource.GetDescendants().forEach((marker) => {
			if (marker.IsA("Keyframe")) {
				lenght = math.max(lenght, marker.Time);
			}

			if (!marker.IsA("KeyframeMarker")) return;

			const keyframe = marker.FindFirstAncestorOfClass("Keyframe");
			if (!keyframe) {
				warn(`Could not find keyframe for marker ${marker.Name}`);
				return;
			}

			events.push({
				Name: marker.Name,
				Value: marker.Value,
				Time: keyframe.Time,
				NeedProgress: 0,
			});
		});

		events.sort((a, b) => a.Time < b.Time);
		events.forEach((event, index) => {
			events[index].NeedProgress = event.Time / lenght;
		});

		const data: AnimationData = {
			Name: animation.Name,
			Id: id,
			Config: {
				Length: lenght,
				Animation: animation,
				Events: events,
			},
			State: this.createAnimationState(animationSource.Priority, animationSource.Loop),
		};

		ServerAnimator.cachedAnimations.set(id, {
			Config: data.Config,
			Priority: animationSource.Priority,
			Looped: animationSource.Loop,
		});

		this.atom(
			produce(this.atom(), (draft) => {
				draft.set(id, data);
			}),
		);

		return this.createTrack(data, id);
	}

	/**
	 * Destroys all AnimationTrack instances stored in the ServerAnimator.
	 * Should be called when the ServerAnimator is no longer needed.
	 */
	public Destroy() {
		this.tracks.forEach((track) => {
			track.Destroy();
		});
	}
}
