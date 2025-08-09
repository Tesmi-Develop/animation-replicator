import { AnimationData } from "../types";
import { AnimationRender } from "./animation-render";
import { Atom, atom, observe, subscribe } from "@rbxts/charm";

/**
 * Manages and renders animations on the client-side by observing changes in animation data.
 * This class creates and updates `AnimationRender` instances based on the provided animation state.
 */
export class ClientAnimator {
	private connection?: () => void;

	/**
	 * Constructs a ClientAnimator instance.
	 * @param animator The animator used for rendering animations.
	 * @param atom The state container holding a map of animation data.
	 */

	constructor(
		private animator: Animator,
		private atom: Atom<Map<string, AnimationData>>,
	) {}

	private createTrack(animationData: AnimationData, id: string) {
		const newAtom = atom(animationData.State);
		const newTrack = new AnimationRender(newAtom, animationData.Config, this.animator);

		const connection = subscribe(
			() => this.atom().get(id),
			(newState) => {
				if (!newState) {
					connection?.();
					newTrack.Destroy();
					return;
				}

				newAtom(newState.State);
			},
		);
	}

	/**
	 * Start observing the animation state.
	 */
	public Start() {
		this.connection = observe(this.atom, (animations) => {
			this.createTrack(animations, animations.Id);
		});
	}

	/**
	 * Destroys the ClientAnimator.
	 */
	public Destroy() {
		this.connection?.();
	}
}
