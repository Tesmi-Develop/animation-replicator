export interface AnimationEvent {
	Name: string;
	Time: number;
	NeedProgress: number;
	Value: string;
}

export interface AnimationData {
	Name: string;
	Id: string;
	Config: {
		Length: number;
		Animation: Animation;
		Events: AnimationEvent[];
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
