import { getData, utils, v2, v3, WrappedDocument } from "@govtechsg/open-attestation";
import { TradeTrustErc721Factory } from "@govtechsg/token-registry";
import { constants } from "ethers";
import { VerificationFragmentType, Verifier } from "../../../types/core";
import { OpenAttestationEthereumTokenRegistryStatusCode } from "../../../types/error";
import { contractNotMinted, getErrorReason } from "./errors";
import { getIssuersTokenRegistry, getProvider } from "../../../common/utils";

interface Status {
  minted: boolean;
  address: string;
  reason?: any;
}

const isWrappedV2Document = (document: any): document is WrappedDocument<v2.OpenAttestationDocument> => {
  return document.data && document.data.issuers;
};
const name = "OpenAttestationEthereumTokenRegistryStatus";
const type: VerificationFragmentType = "DOCUMENT_STATUS";
export const openAttestationEthereumTokenRegistryStatus: Verifier<
  WrappedDocument<v2.OpenAttestationDocument> | WrappedDocument<v3.OpenAttestationDocument>
> = {
  skip: () => {
    return Promise.resolve({
      status: "SKIPPED",
      type,
      name,
      reason: {
        code: OpenAttestationEthereumTokenRegistryStatusCode.SKIPPED,
        codeString:
          OpenAttestationEthereumTokenRegistryStatusCode[OpenAttestationEthereumTokenRegistryStatusCode.SKIPPED],
        message: `Document issuers doesn't have "tokenRegistry" property or ${v3.Method.TokenRegistry} method`,
      },
    });
  },
  test: (document) => {
    if (utils.isWrappedV3Document(document)) {
      const documentData = getData(document);
      return documentData.proof.method === v3.Method.TokenRegistry;
    } else if (isWrappedV2Document(document)) {
      const documentData = getData(document);
      return documentData.issuers.some((issuer) => "tokenRegistry" in issuer);
    }
    return false;
  },
  verify: async (document, options) => {
    try {
      const tokenRegistries = getIssuersTokenRegistry(document);
      if (tokenRegistries.length > 1) {
        throw new Error(`Only one token registry is allowed. Found ${tokenRegistries.length}`);
      }
      const merkleRoot = `0x${document.signature.merkleRoot}`;
      const statuses: Status[] = await Promise.all(
        tokenRegistries.map(async (tokenRegistry) => {
          try {
            const tokenRegistryContract = await TradeTrustErc721Factory.connect(tokenRegistry, getProvider(options));
            const minted = await tokenRegistryContract
              .ownerOf(merkleRoot)
              .then((owner) => !(owner === constants.AddressZero));
            const status: Status = {
              minted,
              address: tokenRegistry,
            };
            if (!minted) {
              status.reason = contractNotMinted(merkleRoot, tokenRegistry);
            }
            return status;
          } catch (e) {
            return { minted: false, address: tokenRegistry, reason: getErrorReason(e, tokenRegistry, merkleRoot) };
          }
        })
      );
      const notMinted = statuses.find((status) => !status.minted);
      if (notMinted) {
        return {
          name,
          type,
          data: { mintedOnAll: false, details: utils.isWrappedV3Document(document) ? statuses[0] : statuses },
          reason: notMinted.reason,
          status: "INVALID",
        };
      }
      return {
        name,
        type,
        data: { mintedOnAll: true, details: utils.isWrappedV3Document(document) ? statuses[0] : statuses },
        status: "VALID",
      };
    } catch (e) {
      return {
        name,
        type,
        data: e,
        reason: {
          message: e.message,
          code: OpenAttestationEthereumTokenRegistryStatusCode.UNEXPECTED_ERROR,
          codeString:
            OpenAttestationEthereumTokenRegistryStatusCode[
              OpenAttestationEthereumTokenRegistryStatusCode.UNEXPECTED_ERROR
            ],
        },
        status: "ERROR",
      };
    }
  },
};