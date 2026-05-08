import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
