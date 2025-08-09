import { Workspace } from "@rbxts/services";

export const GetCurrentTime = () => {
	return Workspace.GetServerTimeNow();
};

export function CalculateProgress(startTime: number, endTime: number, passed: number) {
	passed = math.clamp(passed, 0, 1);
	const alpha = math.clamp((GetCurrentTime() - startTime) / (endTime - startTime), 0, 1);
	return math.clamp(alpha * (1 - passed) + passed, 0, 1);
}

export function CalculateNewProgress(
	startTime: number,
	endTime: number,
	passed: number,
	duraction: number,
	newMultiplier: number,
) {
	const alpha = math.clamp((GetCurrentTime() - startTime) / (endTime - startTime), 0, 1);
	const newProgress = math.clamp(alpha * (1 - passed) + passed, 0, 1);
	const newEndTime = (1 - passed) * (duraction / newMultiplier) + GetCurrentTime();

	return {
		PassedProgress: newProgress,
		EndTime: newEndTime,
	};
}
