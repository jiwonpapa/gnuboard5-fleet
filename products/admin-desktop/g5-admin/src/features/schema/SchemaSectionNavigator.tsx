import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import type { AdminSchemaLayout } from "../../types/AdminSchemaLayout";

export type SchemaSectionView = {
  content: ReactNode;
  description?: string | null;
  key: string;
  label: string;
  navigationLabel?: string;
};

const fallbackLayout: AdminSchemaLayout = {
  desktop: "stack",
  mobile: "stack",
  single_open: false,
};

export function SchemaSectionNavigator(props: {
  activeSectionKey?: string;
  ariaLabel?: string;
  layout?: AdminSchemaLayout | null;
  onActiveSectionKeyChange?: (sectionKey: string) => void;
  sections: ReadonlyArray<SchemaSectionView>;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const layout = props.layout ?? fallbackLayout;
  const activePresentation = isDesktop ? layout.desktop : layout.mobile;
  const orderedSections = useMemo(
    () => props.sections.filter((section) => section.key.trim().length > 0),
    [props.sections],
  );

  if (orderedSections.length === 0) {
    return null;
  }

  const sectionsSignature = orderedSections.map((section) => section.key).join("|");

  return (
    <SchemaSectionNavigatorStateful
      key={`${activePresentation}:${sectionsSignature}`}
      activePresentation={activePresentation}
      activeSectionKey={props.activeSectionKey}
      ariaLabel={props.ariaLabel}
      isDesktop={isDesktop}
      layout={layout}
      onActiveSectionKeyChange={props.onActiveSectionKeyChange}
      orderedSections={orderedSections}
    />
  );
}

function SchemaSectionNavigatorStateful(props: {
  activePresentation: AdminSchemaLayout["desktop"] | AdminSchemaLayout["mobile"];
  activeSectionKey?: string;
  ariaLabel?: string;
  isDesktop: boolean;
  layout: AdminSchemaLayout;
  onActiveSectionKeyChange?: (sectionKey: string) => void;
  orderedSections: ReadonlyArray<SchemaSectionView>;
}) {
  const [internalActiveSectionKey, setInternalActiveSectionKey] = useState(
    props.orderedSections[0]?.key ?? "",
  );
  const [openSectionKeys, setOpenSectionKeys] = useState<string[]>(() =>
    props.orderedSections[0] ? [props.orderedSections[0].key] : [],
  );
  const activeSectionKey = useMemo(() => {
    const currentActiveSectionKey =
      props.activeSectionKey ?? internalActiveSectionKey;
    if (
      currentActiveSectionKey.length > 0
      && props.orderedSections.some((section) => section.key === currentActiveSectionKey)
    ) {
      return currentActiveSectionKey;
    }

    return props.orderedSections[0]?.key ?? "";
  }, [internalActiveSectionKey, props.activeSectionKey, props.orderedSections]);

  const setActiveSectionKey = (nextSectionKey: string) => {
    if (props.activeSectionKey === undefined) {
      setInternalActiveSectionKey(nextSectionKey);
    }
    props.onActiveSectionKeyChange?.(nextSectionKey);
  };

  if (props.activePresentation === "tabs" && props.orderedSections.length > 1) {
    return (
      <Tabs
        className="schema-section-tabs min-h-0 gap-4"
        value={activeSectionKey}
        onValueChange={setActiveSectionKey}
      >
        <div className="schema-section-tabs-strip pb-1">
          <TabsList
            aria-label={props.ariaLabel ?? "섹션 탭"}
            variant="line"
            className="schema-section-tabs-list h-auto w-full flex-wrap justify-start gap-1.5 rounded-none border-b border-border bg-transparent p-0 text-sm"
          >
            {props.orderedSections.map((section) => (
              <TabsTrigger
                key={section.key}
                data-schema-section-key={section.key}
                value={section.key}
                className="schema-section-tabs-trigger h-10 flex-none rounded-sm px-3 py-2 text-[0.82rem] font-semibold"
              >
                {section.navigationLabel ?? section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {props.orderedSections.map((section) => (
          <TabsContent
            key={section.key}
            className="schema-section-tabs-content mt-0 min-h-0"
            data-schema-section-key={section.key}
            value={section.key}
          >
            <SchemaTabbedPanel description={section.description}>
              {section.content}
            </SchemaTabbedPanel>
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  if (props.isDesktop) {
    return (
      <div className="space-y-4">
        {props.orderedSections.map((section) => (
          <SchemaSectionCard
            key={section.key}
            description={section.description}
            title={section.label}
          >
            {section.content}
          </SchemaSectionCard>
        ))}
      </div>
    );
  }

  if (props.layout.mobile === "stack") {
    return (
      <div className="space-y-3">
        {props.orderedSections.map((section) => (
          <SchemaSectionCard
            key={section.key}
            description={section.description}
            title={section.label}
          >
            {section.content}
          </SchemaSectionCard>
        ))}
      </div>
    );
  }

  if (props.layout.single_open) {
    return (
      <Accordion
        className="space-y-3"
        collapsible
        type="single"
        value={openSectionKeys[0] ?? ""}
        onValueChange={(nextValue: string) => {
          setOpenSectionKeys(nextValue ? [nextValue] : []);
        }}
      >
        {props.orderedSections.map((section) => (
          <AccordionItem
            key={section.key}
            className="overflow-hidden rounded-sm border border-border bg-card"
            value={section.key}
          >
            <AccordionTrigger className="px-5 py-4 no-underline hover:no-underline">
              <div className="min-w-0 space-y-1 text-left">
                <div className="text-sm font-semibold text-foreground">
                  {section.navigationLabel ?? section.label}
                </div>
                {section.description ? (
                  <div className="text-xs leading-5 text-muted-foreground">
                    {section.description}
                  </div>
                ) : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pt-0 pb-5">
              {section.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <Accordion
      className="space-y-3"
      type="multiple"
      value={openSectionKeys}
      onValueChange={(nextValue: string[]) => {
        setOpenSectionKeys(nextValue);
      }}
    >
      {props.orderedSections.map((section) => (
        <AccordionItem
          key={section.key}
          className="overflow-hidden rounded-sm border border-border bg-card"
          value={section.key}
        >
          <AccordionTrigger className="px-5 py-4 no-underline hover:no-underline">
            <div className="min-w-0 space-y-1 text-left">
              <div className="text-sm font-semibold text-foreground">
                {section.navigationLabel ?? section.label}
              </div>
              {section.description ? (
                <div className="text-xs leading-5 text-muted-foreground">
                  {section.description}
                </div>
              ) : null}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pt-0 pb-5">
            {section.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function SchemaTabbedPanel(props: {
  children: ReactNode;
  description?: string | null;
}) {
  return (
    <div className="schema-section-panel overflow-hidden rounded-sm border border-border bg-card">
      {props.description ? (
        <div className="schema-section-panel-description border-b border-border/80 px-5 py-3 text-xs leading-5 text-muted-foreground">
          {props.description}
        </div>
      ) : null}
      <div className="schema-section-panel-content p-5">
        {props.children}
      </div>
    </div>
  );
}

function SchemaSectionCard(props: {
  children: ReactNode;
  description?: string | null;
  id?: string;
  labelledBy?: string;
  title: string;
}) {
  return (
    <Card
      aria-labelledby={props.labelledBy}
      id={props.id}
      role={props.id ? "tabpanel" : undefined}
    >
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        {props.description ? (
          <CardDescription>{props.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

function useMediaQuery(query: string) {
  const getMatches = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
}
