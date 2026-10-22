"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Globe, Search, X, Check, ChevronDown } from "lucide-react";
import { COUNTRIES, CountryOption } from "@/data/countries";

interface CountrySelectorProps {
  value: CountryOption | null;
  onChange: (country: CountryOption | null) => void;
  disabled?: boolean;
  className?: string;
}

export default function CountrySelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();

  // Filter countries case-insensitively
  const filteredCountries = searchQuery.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : COUNTRIES;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredCountries.length > 0) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen, filteredCountries.length]);

  const handleSelect = (country: CountryOption) => {
    onChange(country);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < filteredCountries.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCountries.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCountries[activeIndex]) {
        handleSelect(filteredCountries[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-bold text-ink">
        Country (Optional):
      </label>

      {/* Trigger / Display Box */}
      <div
        className={`relative flex items-center bg-white border border-ink/20 rounded-xl transition-all ${
          disabled ? "opacity-60 cursor-not-allowed bg-sand/20" : "hover:border-ink/40 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 cursor-pointer"
        } ${isOpen ? "ring-2 ring-ink/10 border-ink" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
      >
        <Globe className="w-4 h-4 text-ink-muted shrink-0 ml-3.5 pointer-events-none" />

        {value && !isOpen ? (
          <div className="flex-1 flex items-center justify-between px-3 py-2.5 text-xs text-ink font-medium">
            <span className="truncate flex items-center gap-2">
              <span className="font-semibold">{value.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sand/40 border border-ink/10 text-ink-muted">
                {value.code}
              </span>
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-sand/40 rounded-full text-ink-muted hover:text-ink transition-colors ml-2"
              title="Clear country filter"
              aria-label="Clear country selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 relative flex items-center">
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={value ? value.name : "Search country (e.g. United States, India, Germany)..."}
              className="w-full bg-transparent px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none"
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                }}
                className="p-1 hover:bg-sand/40 rounded-full text-ink-muted hover:text-ink mr-2"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="pr-3 pointer-events-none text-ink-muted">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-ink/20 rounded-xl shadow-xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 duration-150">
          <div className="p-2 border-b border-ink/10 bg-sand/15 text-[11px] font-mono text-ink-muted flex items-center justify-between">
            <span>{filteredCountries.length} countries available</span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-amber-900 font-bold hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="overflow-y-auto flex-1 divide-y divide-ink/5 custom-scrollbar"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => {
                const isSelected = value?.code === country.code;
                const isActive = index === activeIndex;

                return (
                  <li
                    key={country.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                      isActive ? "bg-sand/40 text-ink" : "text-ink"
                    } ${isSelected ? "bg-amber-50/70 font-semibold" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-6 text-[10px] font-mono uppercase text-ink-muted text-center shrink-0">
                        {country.code}
                      </span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center text-xs text-ink-muted italic">
                No countries match &quot;{searchQuery}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
