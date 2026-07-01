// Logo minimal et plat (monochrome) : une simple bulle de chat.
export default function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" stroke="currentColor" strokeOpacity="0.28" />
      <path
        d="M10 11.5h12a2.2 2.2 0 0 1 2.2 2.2v4.6a2.2 2.2 0 0 1-2.2 2.2h-6l-3.6 2.8v-2.8H10a2.2 2.2 0 0 1-2.2-2.2v-4.6A2.2 2.2 0 0 1 10 11.5z"
        fill="currentColor"
      />
    </svg>
  );
}
