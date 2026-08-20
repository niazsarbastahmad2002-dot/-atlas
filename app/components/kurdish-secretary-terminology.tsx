"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { applyClinicTerminology } from "@/lib/i18n/terminology";

const normalizedAttributes = ["aria-label", "title", "placeholder", "alt"] as const;

function normalizeTextNode(node: Text, locale: UiLocale) {
  const parent = node.parentElement;
  if (!parent || parent.closest("script,style,noscript,textarea")) return;
  const current = node.nodeValue ?? "";
  const next = applyClinicTerminology(current, locale);
  if (next !== current) node.nodeValue = next;
}

function normalizeElement(element: Element, locale: UiLocale) {
  for (const attribute of normalizedAttributes) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const next = applyClinicTerminology(current, locale);
    if (next !== current) element.setAttribute(attribute, next);
  }
}

function normalizeSubtree(root: Node, locale: UiLocale) {
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(root as Text, locale);
    return;
  }

  if (root instanceof Element) normalizeElement(root, locale);

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    normalizeTextNode(textNode as Text, locale);
    textNode = textWalker.nextNode();
  }

  if (root instanceof Element || root instanceof DocumentFragment || root instanceof Document) {
    const scope = root as ParentNode;
    scope.querySelectorAll?.("[aria-label],[title],[placeholder],[alt]").forEach((element) => normalizeElement(element, locale));
  }
}

export function KurdishSecretaryTerminology({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    if (locale !== "ku" && locale !== "bd") return;

    normalizeSubtree(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          normalizeSubtree(mutation.target, locale);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          normalizeElement(mutation.target, locale);
          continue;
        }
        mutation.addedNodes.forEach((node) => normalizeSubtree(node, locale));
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...normalizedAttributes],
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
