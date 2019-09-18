/**
 * @jest-environment node
 */
const { execute } = require("./documentStore");

describe("documentStoreApi(integration)", () => {
  it("should reject if the contract is not deployed", async () => {
    await expect(
      execute({
        contractAddress: "0x0000000000000000000000000000000000000000",
        method: "isIssued",
        args: [
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
      })
    ).rejects.toThrow("contract not deployed");
  });

  it("should reject for args not conforming to ABI", async () => {
    await expect(
      execute({
        contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        method: "isIssued",
        args: ["0000"]
      })
    ).rejects.toThrow("invalid input argument");
  });

  it("should reject for undefined function", async () => {
    await expect(
      execute({
        contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        method: "foobar",
        args: [
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
      })
    ).rejects.toThrow("contract.functions[method] is not a function");
  });

  it("should works for isIssued", async () => {
    const issuedStatus = await execute({
      contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
      method: "isIssued",
      args: [
        "0x1a040999254caaf7a33cba67ec6a9b862da1dacf8a0d1e3bb76347060fc615d6"
      ]
    });
    expect(issuedStatus).toBe(true);

    const notIssuedStatus = await execute({
      contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
      method: "isIssued",
      args: [
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      ]
    });
    expect(notIssuedStatus).toBe(false);
  }, 10000);

  it("should works for isRevoked", async () => {
    const revokedStatus = await execute({
      contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
      method: "isRevoked",
      args: [
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      ]
    });
    expect(revokedStatus).toBe(true);

    const notRevokedStatus = await execute({
      contractAddress: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
      method: "isRevoked",
      args: [
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      ]
    });
    expect(notRevokedStatus).toBe(false);
  }, 10000);
});
