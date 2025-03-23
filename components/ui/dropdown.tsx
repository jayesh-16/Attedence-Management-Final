"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { SetStateActionType } from "@/types/set-state-action-type";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

const useDropdownContext = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownContext must be used within a DropdownProvider");
  }
  return context;
};

interface DropdownProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: SetStateActionType<boolean>;
}

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const clickOutsideRef = useClickOutside(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.pointerEvents = "none";
    } else {
      triggerRef.current?.focus();
      document.body.style.pointerEvents = "auto";
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <DropdownContext.Provider value={{ isOpen, handleOpen, handleClose }}>
      <div ref={clickOutsideRef} className="relative">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownContentProps {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
}

export function DropdownContent({
  children,
  align = "center",
  className,
}: DropdownContentProps) {
  const { isOpen, handleClose } = useDropdownContext();

  return (
    <div
      className={cn(
        "absolute z-50 rounded-md border bg-background shadow-lg",
        {
          "left-0": align === "start",
          "right-0": align === "end",
          "left-1/2 -translate-x-1/2": align === "center",
        },
        className
      )}
      style={{ display: isOpen ? "block" : "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const { handleOpen } = useDropdownContext();

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={cn("inline-flex items-center justify-center rounded-md", className)}
    >
      {children}
    </button>
  );
}

export function DropdownClose({ children }: PropsWithChildren) {
  const { handleClose } = useDropdownContext();

  return (
    <button
      type="button"
      onClick={handleClose}
      className="text-muted-foreground hover:text-primary"
    >
      {children}
    </button>
  );
}
