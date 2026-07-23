import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import { ShieldCheck, type LucideIcon } from "lucide-react";

export function PasswordField(props: {
  autoComplete: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <InputGroup className="h-12 rounded-[1rem] border-border/70">
        <InputGroupAddon className="pl-3 pr-0">
          <InputGroupText>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={props.id}
          type="password"
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          autoComplete={props.autoComplete}
          disabled={props.disabled}
        />
      </InputGroup>
    </div>
  );
}

export function OtpField(props: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <InputGroup className="h-12 rounded-[1rem] border-border/70">
        <InputGroupAddon className="pl-3 pr-0">
          <InputGroupText>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={props.id}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          disabled={props.disabled}
        />
      </InputGroup>
    </div>
  );
}

export function StatusPill(props: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <strong className="text-sm font-semibold text-foreground">{props.title}</strong>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.description}</p>
    </div>
  );
}

export function SecuritySummaryRow(props: { title: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {props.title}
      </p>
      <p className="mt-1 text-sm text-foreground">{props.value}</p>
    </div>
  );
}
