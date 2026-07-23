import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { SftpTransferConcurrencyInput } from "../../types/SftpTransferConcurrencyInput";
import type { SftpTransferEnqueueInput } from "../../types/SftpTransferEnqueueInput";
import type { SftpTransferItemControlInput } from "../../types/SftpTransferItemControlInput";
import type { SftpTransferQueueSnapshot } from "../../types/SftpTransferQueueSnapshot";
import type { SftpTransferSnapshotInput } from "../../types/SftpTransferSnapshotInput";
import { invokeCommand } from "./core";

export const SFTP_TRANSFER_QUEUE_EVENT = "g5:sftp-transfer-queue";

export async function getSftpTransferQueueSnapshot(
  input: SftpTransferSnapshotInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_snapshot", { input });
}

export async function enqueueSftpTransfers(
  input: SftpTransferEnqueueInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_enqueue", { input });
}

export async function pauseSftpTransfer(
  input: SftpTransferItemControlInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_pause", { input });
}

export async function retrySftpTransfer(
  input: SftpTransferItemControlInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_retry", { input });
}

export async function cancelSftpTransfer(
  input: SftpTransferItemControlInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_cancel", { input });
}

export async function setSftpTransferConcurrency(
  input: SftpTransferConcurrencyInput,
): Promise<SftpTransferQueueSnapshot> {
  return invokeCommand<SftpTransferQueueSnapshot>("cmd_sftp_transfer_set_concurrency", { input });
}

export async function listenSftpTransferQueue(
  onSnapshot: (payload: SftpTransferQueueSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<SftpTransferQueueSnapshot>(SFTP_TRANSFER_QUEUE_EVENT, ({ payload }) => {
    onSnapshot(payload);
  });
}
