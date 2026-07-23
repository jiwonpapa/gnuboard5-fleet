import { describe, expect, it } from "vitest";
import type { SshProfile } from "../../types/SshProfile";
import {
  buildSshProfileJsonFilename,
  parseSshProfilesJson,
  serializeSshProfilesToJson,
} from "./site-ssh-profile-json";

const SAMPLE_PROFILE: SshProfile = {
  auth_type: "key",
  created_at: "2026-03-27T00:00:00Z",
  has_key_passphrase: false,
  has_password: false,
  host: "gnurestapi.cc",
  id: "profile-1",
  key_path: "~/.ssh/id_ed25519",
  name: "운영서버",
  port: 22,
  site_id: "site-1",
  updated_at: "2026-03-27T00:00:00Z",
  username: "neojins",
};

describe("site-ssh-profile-json", () => {
  it("serializes profiles without secrets and parses them back", () => {
    const json = serializeSshProfilesToJson([SAMPLE_PROFILE]);
    const parsed = parseSshProfilesJson(json);

    expect(parsed).toEqual([
      {
        auth_type: "key",
        host: "gnurestapi.cc",
        id: "profile-1",
        key_path: "~/.ssh/id_ed25519",
        name: "운영서버",
        port: 22,
        username: "neojins",
      },
    ]);
    expect(json).not.toContain("password");
    expect(json).not.toContain("key_passphrase");
  });

  it("supports bare profiles arrays during import", () => {
    const parsed = parseSshProfilesJson(
      JSON.stringify([
        {
          auth_type: "password",
          host: "example.com",
          name: "스테이징",
          port: 2202,
          username: "deploy",
        },
      ]),
    );

    expect(parsed[0]).toMatchObject({
      auth_type: "password",
      host: "example.com",
      name: "스테이징",
      port: 2202,
      username: "deploy",
    });
  });

  it("builds a stable export filename", () => {
    expect(buildSshProfileJsonFilename("운영 사이트 #1")).toMatch(
      /^운영-사이트-1-ssh-profiles-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });
});
