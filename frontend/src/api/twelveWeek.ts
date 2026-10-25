import { apiClient } from "./client"
import type { TwelveWeekCycle, TwelveWeekCycleSummary, TwelveWeekGoalWrite, TwelveWeekModelBlockWrite, TwelveWeekOccurrenceUpdate, TwelveWeekTacticWrite, TwelveWeekWeekReview } from "@/types/entities"

const base = "/plan/12-week/cycles"
export const fetchTwelveWeekCycles = () => apiClient.get<TwelveWeekCycleSummary[]>(base)
export const fetchTwelveWeekCycle = (id: number) => apiClient.get<TwelveWeekCycle>(`${base}/${id}`)
export const createTwelveWeekCycle = (data: { title: string; start_date: string; timezone: string }) => apiClient.post<TwelveWeekCycle>(base, data)
export const deleteTwelveWeekCycle = (id: number) => apiClient.del<void>(`${base}/${id}`)
export const saveTwelveWeekWorkbook = (id: number, answers: Record<string, unknown>) => apiClient.put<TwelveWeekCycle>(`${base}/${id}/workbook`, { answers })
export const transitionTwelveWeekCycle = (id: number, action: "activate" | "complete" | "abandon") => apiClient.post<TwelveWeekCycle>(`${base}/${id}/transition/${action}`)
export const createTwelveWeekGoal = (id: number, data: TwelveWeekGoalWrite) => apiClient.post<TwelveWeekCycle>(`${base}/${id}/goals`, data)
export const updateTwelveWeekGoal = (id: number, goalId: number, data: TwelveWeekGoalWrite) => apiClient.put<TwelveWeekCycle>(`${base}/${id}/goals/${goalId}`, data)
export const deleteTwelveWeekGoal = (id: number, goalId: number) => apiClient.del<TwelveWeekCycle>(`${base}/${id}/goals/${goalId}`)
export const createTwelveWeekTactic = (id: number, goalId: number, data: TwelveWeekTacticWrite) => apiClient.post<TwelveWeekCycle>(`${base}/${id}/goals/${goalId}/tactics`, data)
export const updateTwelveWeekTactic = (id: number, tacticId: number, data: TwelveWeekTacticWrite) => apiClient.put<TwelveWeekCycle>(`${base}/${id}/tactics/${tacticId}`, data)
export const deleteTwelveWeekTactic = (id: number, tacticId: number) => apiClient.del<TwelveWeekCycle>(`${base}/${id}/tactics/${tacticId}`)
export const updateTwelveWeekOccurrence = (id: number, occurrenceId: number, data: TwelveWeekOccurrenceUpdate) => apiClient.put<TwelveWeekCycle>(`${base}/${id}/occurrences/${occurrenceId}`, data)
export const saveTwelveWeekReview = (id: number, week: number, data: TwelveWeekWeekReview) => apiClient.put<TwelveWeekCycle>(`${base}/${id}/weeks/${week}/review`, data)
export const transitionTwelveWeekWeek = (id: number, week: number, action: "finalize" | "reopen") => apiClient.post<TwelveWeekCycle>(`${base}/${id}/weeks/${week}/transition/${action}`)
export const createTwelveWeekModelBlock = (id: number, data: TwelveWeekModelBlockWrite) => apiClient.post<TwelveWeekCycle>(`${base}/${id}/model-blocks`, data)
export const deleteTwelveWeekModelBlock = (id: number, blockId: number) => apiClient.del<TwelveWeekCycle>(`${base}/${id}/model-blocks/${blockId}`)
export const applyTwelveWeekModel = (id: number, week: number) => apiClient.post<TwelveWeekCycle>(`${base}/${id}/weeks/${week}/apply-model-week`)
