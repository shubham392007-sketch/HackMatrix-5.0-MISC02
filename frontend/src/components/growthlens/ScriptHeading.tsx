"use client";

import React from "react";

interface ScriptHeadingProps {
  preText?: string;
  scriptWord: string;
  postText?: string;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  scriptClassName?: string;
}

export default function ScriptHeading({
  preText,
  scriptWord,
  postText,
  level = 1,
  className = "",
  scriptClassName = "",
}: ScriptHeadingProps) {
  const content = (
    <>
      {preText && <span>{preText} </span>}
      <span
        className={`inline-block font-normal text-current lowercase ${scriptClassName}`}
        style={{ fontFamily: "'Yellowtail', cursive" }}
      >
        {scriptWord}
      </span>
      {postText && <span> {postText}</span>}
    </>
  );

  const baseStyles = "tracking-tight text-[#1C1C1C] font-extrabold";

  if (level === 1) {
    return (
      <h1 className={`text-4xl md:text-6xl lg:text-7xl leading-[1.08] ${baseStyles} ${className}`}>
        {content}
      </h1>
    );
  }
  if (level === 2) {
    return (
      <h2 className={`text-2xl md:text-4xl lg:text-5xl leading-tight ${baseStyles} ${className}`}>
        {content}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 className={`text-xl md:text-2xl leading-snug ${baseStyles} ${className}`}>
        {content}
      </h3>
    );
  }
  return (
    <h4 className={`text-lg md:text-xl ${baseStyles} ${className}`}>
      {content}
    </h4>
  );
}
