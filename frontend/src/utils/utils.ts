export const toReadableText = (text: string) => {
  return text.split("_").join(" ");
};
export function formatRevenue(value) {
  if (value < 1000) return `₹${value}`;
  const units = ["K", "M", "B", "T"];
  let unitIndex = -1;
  let formattedValue = value;

  while (formattedValue >= 1000 && unitIndex < units.length - 1) {
    formattedValue /= 1000;
    unitIndex++;
  }

  return `${formattedValue.toFixed(1)}${units[unitIndex]}`;
}
