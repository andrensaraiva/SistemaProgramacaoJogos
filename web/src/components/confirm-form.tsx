"use client";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
}

export function ConfirmForm({ action, message, children }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
