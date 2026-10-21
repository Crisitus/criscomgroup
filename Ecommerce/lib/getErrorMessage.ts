import axios from 'axios';

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<{ message?: string; error?: string; msg?: string }>(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.response?.data?.msg || error.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
