// Money formatting was `new Intl.NumberFormat("en-US", { currency: "USD" })`
// hardcoded in each page, with nothing recording what the stored numbers
// actually were. Every amount now arrives from the API with the currency it
// was recorded in.

const DEFAULT_CURRENCY = "USD";

const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string, maximumFractionDigits: number) => {
  const key = `${currency}:${maximumFractionDigits}`;
  const cached = formatterCache.get(key);

  if (cached) {
    return cached;
  }

  let formatter: Intl.NumberFormat;

  try {
    formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits,
    });
  } catch {
    // An unknown or malformed code should not blank out the figure.
    formatter = new Intl.NumberFormat(undefined, {
      style: "decimal",
      maximumFractionDigits,
    });
  }

  formatterCache.set(key, formatter);
  return formatter;
};

export const parseAmount = (value: string | number | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (
  value: string | number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  { compact = false }: { compact?: boolean } = {}
): string => {
  const amount = parseAmount(value);
  const formatter = getFormatter(
    (currency || DEFAULT_CURRENCY).toUpperCase(),
    compact ? 0 : 2
  );

  const formatted = formatter.format(amount);

  // The decimal fallback above loses the currency marker, so put the code back
  // rather than showing a bare number that could be any currency.
  return formatted.includes(currency) || /[^\d.,\s-]/.test(formatted)
    ? formatted
    : `${currency} ${formatted}`;
};

// Six pages and components each carried their own copy of this, all of them
// pinned to en-US/USD. The variant that distinguishes "no value recorded" from
// "zero" lives here so that distinction is made the same way everywhere.
export const formatCurrencyOrFallback = (
  value: string | number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  fallback = "Not set"
): string => {
  const numeric = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? formatCurrency(numeric, currency) : fallback;
};

export { DEFAULT_CURRENCY };
