import * as React from "react";
import { useTranslation } from "react-i18next";
import { format, isValid, parse, parseISO } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function parseDate(value?: string) {
  if (!value) return undefined;
  const normalized = value.split(" ")[0];
  if (!normalized) return undefined;
  return parseISO(normalized);
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = React.useMemo(() => {
    if (i18n.language.toLowerCase().startsWith("zh")) {
      return zhCN;
    }
    return enUS;
  }, [i18n.language]);
  const displayFormat = React.useMemo(() => {
    if (i18n.language.toLowerCase().startsWith("zh")) {
      return "yyyy年MM月dd日";
    }
    return "MMMM dd, yyyy";
  }, [i18n.language]);

  const placeholderText = placeholder ?? t("common.selectDate");

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() =>
    parseDate(value),
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [inputValue, setInputValue] = React.useState<string>(() =>
    date ? format(date, displayFormat, { locale }) : "",
  );

  React.useEffect(() => {
    const nextDate = parseDate(value);
    setDate(nextDate);
    setMonth(nextDate);
    setInputValue(nextDate ? format(nextDate, displayFormat, { locale }) : "");
  }, [value, displayFormat, locale]);

  const parseInputDate = React.useCallback(
    (nextValue: string) => {
      if (!nextValue.trim()) {
        return undefined;
      }

      const isoCandidate = parseISO(nextValue);
      if (isValid(isoCandidate)) {
        return isoCandidate;
      }

      const formatted = parse(nextValue, displayFormat, new Date(), { locale });
      if (isValid(formatted)) {
        return formatted;
      }

      const fallback = new Date(nextValue);
      if (isValid(fallback)) {
        return fallback;
      }

      return undefined;
    },
    [displayFormat, locale],
  );

  return (
    <InputGroup className={className}>
      <InputGroupInput
        value={inputValue}
        placeholder={placeholderText}
        onChange={(e) => {
          const nextValue = e.target.value;
          setInputValue(nextValue);
          const parsed = parseInputDate(nextValue);
          if (parsed) {
            setDate(parsed);
            setMonth(parsed);
            onChange(format(parsed, "yyyy-MM-dd"));
          } else if (!nextValue.trim()) {
            setDate(undefined);
            setMonth(undefined);
            onChange("");
          }
        }}
        onBlur={() => {
          if (date) {
            setInputValue(format(date, displayFormat, { locale }));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              variant="ghost"
              size="icon-xs"
              aria-label={t("common.selectDate")}
            >
              <CalendarIcon />
              <span className="sr-only">{t("common.selectDate")}</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              month={month}
              onMonthChange={setMonth}
              onSelect={(nextDate) => {
                setDate(nextDate);
                setInputValue(
                  nextDate ? format(nextDate, displayFormat, { locale }) : "",
                );
                onChange(nextDate ? format(nextDate, "yyyy-MM-dd") : "");
                setOpen(false);
              }}
              locale={locale}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
