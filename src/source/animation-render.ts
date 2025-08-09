import { Atom, subscribe } from "@rbxts/charm";
import { Janitor } from "@rbxts/janitor";
import { AnimationData } from "../types";
import { CalculateProgress } from "../utility";

export class AnimationRender {
	private track: AnimationTrack;
	private janitor = new Janitor();

	/**
	 * @param atom The state of the animation to render
	 * @param config The configuration of the animation
	 * @param animator The animator to use for rendering
	 */
	constructor(
		private atom: Atom<AnimationData["State"]>,
		private config: AnimationData["Config"],
		private animator: Animator,
	) {
		this.track = this.animator.LoadAnimation(this.config.Animation);

		if (atom().IsPlaying) {
			this.playAnimation();
		}

		this.trackState();
	}

	private trackState() {
		this.janitor.Add(
			subscribe(this.atom, (state, prevState) => {
				if (!state.IsPlaying) {
					this.stopAnimation();
					return;
				}

				if (state.IsPlaying !== prevState.IsPlaying) {
					this.playAnimation();
				}

				if (state.PassedProgress !== prevState.PassedProgress || state.Speed !== prevState.Speed) {
					this.track.AdjustSpeed(state.Speed);
					this.track.TimePosition =
						(state.Speed !== 0
							? CalculateProgress(state.StartTime, state.EndTime, state.PassedProgress)
							: state.PassedProgress) * this.config.Length;
				}

				if (state.Looped !== prevState.Looped) {
					this.track.Looped = state.Looped;
				}

				if (state.Priority !== prevState.Priority) {
					this.track.Priority = state.Priority;
				}

				if (state.Weight !== prevState.Weight) {
					this.track.AdjustWeight(state.Weight);
				}
			}),
		);
	}

	private playAnimation() {
		if (this.track.IsPlaying) return;

		const state = this.atom();
		this.track.Priority = state.Priority;
		this.track.Looped = state.Looped;
		this.track.Play(state.FadeTime, state.Weight, state.Speed);
		this.track.TimePosition =
			CalculateProgress(state.StartTime, state.EndTime, state.PassedProgress) * this.config.Length;
	}

	private stopAnimation() {
		this.track.Stop(this.atom().FadeTime);
	}

	/**
	 * Cleans up resources associated with the AnimationRender instance.
	 */

	public Destroy() {
		this.janitor.Cleanup();
	}
}
