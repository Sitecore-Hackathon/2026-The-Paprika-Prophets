"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorAlertProps = {
  error: string | null | undefined;
};

export const ErrorAlert = ({ error }: ErrorAlertProps) => {
  if (!error) return null;
  return (
    <Alert variant="danger">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
