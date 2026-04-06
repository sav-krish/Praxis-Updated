"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECT_CATEGORIES } from "@/lib/subjects";
import { FieldInfoHint } from "@/components/ui/field-info-hint";

interface SubjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (subject: string) => {
    if (subject === "Other / Custom") {
      setShowCustom(true);
      onChange("");
    } else {
      setShowCustom(false);
      onChange(subject);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="subject">Course Subject / Discipline</Label>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value && !showCustom ? value : "Select a subject\u2026"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) max-h-[min(70vh,28rem)] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={false}
        >
          <Command>
            <CommandInput placeholder="Search subjects\u2026" />
            <CommandList>
              <CommandEmpty>No subject found. Choose &quot;Other / Custom&quot;.</CommandEmpty>
              {SUBJECT_CATEGORIES.map((cat) => (
                <CommandGroup key={cat.category} heading={cat.category}>
                  {cat.subjects.map((subject) => (
                    <CommandItem
                      key={subject}
                      value={subject}
                      onSelect={() => handleSelect(subject)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === subject ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {subject}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showCustom && (
        <Input
          id="subject-custom"
          placeholder="Describe your course subject\u2026"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2"
        />
      )}
    </div>
  );
}
