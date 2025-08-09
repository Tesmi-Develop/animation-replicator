export interface AnimationEvent {
	Name: string;
	Time: number;
	Value: string;
}

export interface AnimationData {
	Name: string;
	Id: string;
	Config: {
		Length: number;
		Animation: Animation;
		Events: Map<string, AnimationEvent>;
	};
	State: {
		IsPlaying: boolean;
		PassedProgress: number;
		StartTime: number;
		EndTime: number;
		Weight: number;
		FadeTime: number;
		Speed: number;
		Priority: Enum.AnimationPriority;
		Looped: boolean;
	};
}
