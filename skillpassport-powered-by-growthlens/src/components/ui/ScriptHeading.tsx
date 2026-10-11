import React from "react";

interface ScriptHeadingProps {
  preText?: string;
  scriptWord: string;
  postText?: string;
  className?: string;
  scriptClassName?: string;
}

export default function ScriptHeading({
  preText,
  scriptWord,
  postText,
  className = "",
  scriptClassName = "",
}: ScriptHeadingProps) {
  return (
    <h2 className={`font-extrabold tracking-tight ${className}`}>
      {preText && <span>{preText} </span>}
      <span
        className={`font-normal inline-block transform -rotate-1 ${scriptClassName}`}
        style={{ fontFamily: "'Yellowtail', cursive" }}
      >
        {scriptWord}
      </span>
      {postText && <span> {postText}</span>}
    </h2>
  );
}
