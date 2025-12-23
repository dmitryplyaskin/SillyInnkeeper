import { useMemo } from "react";
import type { MantineSize } from "@mantine/core";
import { TextInput } from "@mantine/core";
import { parseCommaListSmart, stringifyCommaListSmart } from "../utils/listParsing";

export function DeferredCommaListInput({
  label,
  placeholder,
  disabled,
  size,
  values,
  onCommit,
  resetKey,
}: {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  size?: MantineSize;
  values: string[];
  onCommit: (next: string[]) => void;
  resetKey: string | number;
}) {
  const defaultValue = useMemo(() => stringifyCommaListSmart(values), [values]);

  return (
    <TextInput
      key={resetKey}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
      defaultValue={defaultValue}
      onBlur={(e) => onCommit(parseCommaListSmart(e.currentTarget.value))}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const target = e.currentTarget as HTMLInputElement;
        onCommit(parseCommaListSmart(target.value));
      }}
    />
  );
}


