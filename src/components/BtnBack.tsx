"use client";

import { useRouter } from "next/navigation";

interface BtnBackProps {
  href?: string;
  label?: string;
  onClick?: () => void;
}

export default function BtnBack({
  href,
  label = "Volver",
  onClick,
}: BtnBackProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      router.push(href);
      return;
    }
    router.back();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
        color: "var(--color-text-muted)",
        fontSize: "0.85rem",
        fontFamily: "inherit",
        fontWeight: 500,
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        marginBottom: 16,
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.color = "var(--color-primary)";
        e.currentTarget.style.borderColor = "var(--color-accent-soft)";
        e.currentTarget.style.background = "var(--color-primary-light)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = "var(--color-text-muted)";
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.background = "var(--color-surface)";
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
