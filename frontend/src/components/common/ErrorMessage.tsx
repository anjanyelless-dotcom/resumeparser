interface ErrorMessageProps {
  title?: string;
  message: string;
}

export default function ErrorMessage({
  title = "Something went wrong",
  message,
}: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-red-600">{message}</p>
    </div>
  );
}
