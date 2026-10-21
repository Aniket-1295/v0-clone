import { describe, expect, it } from "vitest";
import { profileFromClerk } from "@/lib/users";

describe("profileFromClerk", () => {
  it("reads a webhook payload (snake_case)", () => {
    const profile = profileFromClerk({
      id: "user_1",
      first_name: "Ada",
      last_name: "Lovelace",
      image_url: "https://img/ada.png",
      primary_email_address_id: "e2",
      email_addresses: [
        { id: "e1", email_address: "old@example.com", verification: { status: "verified" } },
        { id: "e2", email_address: "ada@example.com", verification: { status: "verified" } },
      ],
    });
    expect(profile).toEqual({
      clerkId: "user_1",
      name: "Ada Lovelace",
      image: "https://img/ada.png",
      email: "ada@example.com",
      emailVerified: true,
    });
  });

  it("reads a currentUser() object (camelCase)", () => {
    const profile = profileFromClerk({
      id: "user_2",
      firstName: "Grace",
      lastName: null,
      imageUrl: "",
      primaryEmailAddressId: "e1",
      emailAddresses: [{ id: "e1", emailAddress: "grace@example.com", verification: { status: "unverified" } }],
    });
    expect(profile).toMatchObject({ clerkId: "user_2", name: "Grace", image: null, email: "grace@example.com", emailVerified: false });
  });

  it("falls back to the first email and no name", () => {
    const profile = profileFromClerk({ id: "user_3", email_addresses: [{ id: "e9", email_address: "x@example.com" }] });
    expect(profile).toMatchObject({ name: null, email: "x@example.com", emailVerified: false });
  });

  it("handles a user with no email", () => {
    expect(profileFromClerk({ id: "user_4" })).toMatchObject({ email: "", emailVerified: false });
  });
});
