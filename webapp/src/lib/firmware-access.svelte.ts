const fullIdentity = /^LRA-v2-\d+Hz-GPIO\d+-\d+-R\d+-C\d+-D\d+$/;
export type FirmwareStatus = "match" | "mismatch" | "unverified";

/** Acknowledgment lasts only for this connection and these exact settings. */
export class FirmwareAccess {
  private accepted = $state<string | null>(null);

  status(reported: string | null, expected: string | null): FirmwareStatus {
    if (!reported || !expected || !fullIdentity.test(reported) || !fullIdentity.test(expected))
      return "unverified";
    return reported === expected ? "match" : "mismatch";
  }
  allowed(reported: string | null, expected: string | null, config: string): boolean {
    const status = this.status(reported, expected);
    return status === "match" || (status === "unverified" &&
      this.accepted === JSON.stringify([reported, expected, config]));
  }
  acknowledge(reported: string | null, expected: string | null, config: string) {
    if (this.status(reported, expected) === "unverified")
      this.accepted = JSON.stringify([reported, expected, config]);
  }
  reset() {
    this.accepted = null;
  }
}
