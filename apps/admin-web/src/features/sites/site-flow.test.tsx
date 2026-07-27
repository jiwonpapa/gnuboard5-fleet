import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { SiteActivationPage } from "./SiteActivationPage";

describe("site route flow", () => {
  it("replaces legacy global switching with an explicit site_id route", async () => {
    render(
      <MemoryRouter initialEntries={["/sites/site-a/activate"]}>
        <Routes>
          <Route path="/sites/:siteId/activate" element={<SiteActivationPage />} />
          <Route path="/sites/:siteId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("/sites/site-a")).toBeVisible();
  });
});

function LocationProbe() {
  return <span>{useLocation().pathname}</span>;
}
