import { SiteRegistrationForm } from "./SiteRegistrationForm";

export function SiteFormDialog(props: {
  onClose: () => void;
  onRegistered?: Parameters<typeof SiteRegistrationForm>[0]["onRegistered"];
  open: boolean;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={props.onClose}
    >
      <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <SiteRegistrationForm
          compact
          submitLabel="사이트 추가"
          title="새 사이트 추가"
          onRegistered={(catalog) => {
            props.onRegistered?.(catalog);
            props.onClose();
          }}
        />
      </div>
    </div>
  );
}
