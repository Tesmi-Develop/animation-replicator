import { atom, Atom } from "@rbxts/charm";
import { produce } from "@rbxts/immut";
import { RunService } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { AnimationData, AnimationEvent } from "../types";
import { CalculateProgress, GetCurrentTime, CalculateNewProgress } from "../utility";

export class AnimationTracker {
	public readonly Stopped = new Signal<() => void>();
	public readonly Ended = new Signal<() => void>();
	public readonly DidLoop = new Signal<() => void>();
	public readonly MarkerReached = new Signal<(name: string, value: string) => void>();

	/** @hidden */
	public readonly Atom: Atom<AnimationData["State"] | undefined>;
	private config: AnimationData["Config"];
	private signalMarkers = new Map<string, Signal<(value: string) => void>>();
	private animationEvents = new Map<string, AnimationEvent & { NeedProgress: number }>();
	private connectionUpdate?: RBXScriptConnection;

	constructor(animationData: AnimationData) {
		this.Atom = atom(animationData.State) as never;
		this.config = animationData.Config;
	}

	/**
	 * Calculates and returns the current time position of the animation track.
	 * @returns The current time position of the animation.
	 */
	public GetTimePosition() {
		const state = this.Atom()!;
		return CalculateProgress(state.StartTime, state.EndTime, state.PassedProgress) * this.config.Length;
	}

	/**
	 * Retrieves the priority of the current animation.
	 * @returns The priority level of the animation.
	 */
	public GetPriority() {
		const state = this.Atom()!;
		return state.Priority;
	}

	/**
	 * Retrieves whether the animation is currently looping.
	 * @returns Whether the animation is looping.
	 */
	public GetLooped() {
		const state = this.Atom()!;
		return state.Looped;
	}

	/**
	 * Retrieves the target weight of the current animation.
	 * @returns The target weight of the animation.
	 */
	public GetTargetWeight() {
		const state = this.Atom()!;
		return state.Weight;
	}

	/**
	 * Retrieves the speed of the animation.
	 * @returns The speed of the animation.
	 */
	public GetSpeed() {
		const state = this.Atom()!;
		return state.Speed;
	}

	/**
	 * Retrieves whether the animation is currently playing.
	 * @returns Whether the animation is currently playing.
	 */
	public GetIsPlaying() {
		const state = this.Atom()!;
		return state.IsPlaying;
	}

	/**
	 * Sets the priority of the animation track.
	 * @param priority The priority level to set for the animation.
	 */
	public SetPriority(priority: Enum.AnimationPriority) {
		this.Atom(
			produce(this.Atom(), (draft) => {
				draft!.Priority = priority;
			}),
		);
	}

	/**
	 * Sets whether the animation should loop.
	 * @param looped A boolean indicating if the animation should loop.
	 */
	public SetLooped(looped: boolean) {
		this.Atom(
			produce(this.Atom(), (draft) => {
				draft!.Looped = looped;
			}),
		);
	}

	/**
	 * Plays the animation.
	 * @param fadeTime The time it takes for the animation to fade in.
	 * @param weight The weight of the animation.
	 * @param speed The speed of the animation.
	 */
	public Play(fadeTime = 0.100000001, weight = 1, speed = 1) {
		const currentTime = GetCurrentTime();
		this.Atom(
			produce(this.Atom(), (draft) => {
				draft!.Speed = speed;
				draft!.Weight = weight;
				draft!.IsPlaying = true;
				draft!.FadeTime = fadeTime;
				draft!.PassedProgress = 0;
				draft!.StartTime = currentTime;
				draft!.EndTime = currentTime + this.config.Length / speed;
			}),
		);
		this.initAnimationUpdate();
	}

	/**
	 * Adjusts the speed of the animation.
	 * If the animation is not playing, this method does nothing.
	 * @param speed The new speed to set for the animation.
	 */
	public AdjustSpeed(speed: number) {
		const state = this.Atom()!;
		if (!state.IsPlaying) return;

		speed = math.max(speed, 0);
		if (speed === state.Speed && speed === 0) return;

		if (state.Speed === 0 && speed !== 0) {
			this.Atom(
				produce(this.Atom(), (draft) => {
					draft!.Speed = speed;
					draft!.StartTime = GetCurrentTime();
					draft!.EndTime = GetCurrentTime() + (this.config.Length * (1 - state.PassedProgress)) / speed;
				}),
			);
			return;
		}

		const newProgress = CalculateNewProgress(
			state.StartTime,
			state.EndTime,
			state.PassedProgress,
			this.config.Length,
			speed,
		);

		this.Atom(
			produce(this.Atom(), (draft) => {
				draft!.Speed = speed;
				draft!.StartTime = GetCurrentTime();
				draft!.EndTime = speed !== 0 ? newProgress.EndTime : state.EndTime;
				draft!.PassedProgress = newProgress.PassedProgress;
			}),
		);
	}

	/**
	 * Stops the animation.
	 * If the animation is not playing, this method does nothing.
	 * @param fadeTime The time it takes for the animation to fade out.
	 */
	public Stop(fadeTime = 0.100000001) {
		if (!this.Atom()!.IsPlaying) return;

		this.connectionUpdate?.Disconnect();
		this.connectionUpdate = undefined;

		this.Atom(
			produce(this.Atom(), (draft) => {
				draft!.IsPlaying = false;
				draft!.FadeTime = fadeTime;
				draft!.EndTime = 0;
				draft!.StartTime = 0;
			}),
		);
		this.Stopped.Fire();

		const endTime = GetCurrentTime() + fadeTime;
		this.connectionUpdate = RunService.Heartbeat.Connect(() => {
			if (GetCurrentTime() < endTime) return;

			this.Ended.Fire();
			this.connectionUpdate?.Disconnect();
			this.connectionUpdate = undefined;
		});
	}

	/**
	 * Gets a signal that fires when the animation reaches the specified marker.
	 * The signal is fired with the value of the marker.
	 * @param name The name of the marker.
	 * @returns The signal.
	 */
	public GetMarkerReachedSignal(name: string) {
		const signal = this.signalMarkers.get(name) ?? new Signal();
		this.signalMarkers.set(name, signal);

		return signal;
	}

	/**
	 * Cleans up the `AnimationTracker`.
	 * This method should be called when the `AnimationTracker` is no longer needed to free up resources.
	 */
	public Destroy() {
		this.Stop();
		this.Atom(undefined);
		this.signalMarkers.forEach((signal) => {
			signal.Destroy();
		});
		this.Stopped.Destroy();
		this.Ended.Destroy();
		this.DidLoop.Destroy();
		this.MarkerReached.Destroy();
	}

	private initAnimationUpdate() {
		this.animationEvents = new Map<string, AnimationEvent & { NeedProgress: number }>();

		this.config.Events.forEach((event, name) => {
			this.animationEvents.set(name, {
				...event,
				NeedProgress: event.Time / this.config.Length,
			});
		});

		if (this.connectionUpdate) {
			this.connectionUpdate.Disconnect();
			this.connectionUpdate = undefined;
		}

		this.connectionUpdate = RunService.Heartbeat.Connect(() => {
			const state = this.Atom()!;

			if (state.Speed === 0) return;
			const currentProgress = CalculateProgress(state.StartTime, state.EndTime, state.PassedProgress);

			for (const [name, signal] of this.signalMarkers) {
				if (!this.animationEvents.has(name)) continue;

				const needProgress = this.animationEvents.get(name)!.NeedProgress;
				if (currentProgress < needProgress) return;

				const value = this.animationEvents.get(name)!.Value;
				signal.Fire(value);
				this.MarkerReached.Fire(name, value);
				this.animationEvents.delete(name);
			}

			if (currentProgress >= 1) {
				if (state.Looped) {
					this.DidLoop.Fire();
					this.Play(state.FadeTime, state.Weight, state.Speed);
					return;
				}
				this.Stop();
				return;
			}
		});
	}
}
