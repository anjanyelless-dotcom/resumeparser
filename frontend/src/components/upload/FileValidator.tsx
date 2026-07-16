const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
];

type FileValidatorProps = {
  files: File[];
};

export default function FileValidator({ files }: FileValidatorProps) {
  const errors = files.flatMap((file) => {
    const issues: string[] = [];
    if (!ALLOWED_TYPES.includes(file.type)) {
      issues.push("Unsupported file type");
    }
    if (file.size > MAX_BYTES) {
      issues.push("File exceeds 10MB limit");
    }
    return issues.map((issue) => `${file.name}: ${issue}`);
  });

  if (!errors.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      <p className="font-semibold">Validation issues</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
