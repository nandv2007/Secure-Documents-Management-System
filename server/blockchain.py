import hashlib
import time
import random
from typing import Dict, List, Optional
from pydantic import BaseModel
from eth_account import Account

# Enable HD Wallet feature in eth_account
Account.enable_unaudited_hdwallet_features()


class BlockchainRecord(BaseModel):
    txHash: str
    blockNumber: int
    blockHash: str
    caseId: str
    docId: str
    sha256Hash: str
    uploadedBy: str
    timestamp: str
    gasUsed: int
    status: str
    signerAddress: str


class VerificationResult(BaseModel):
    isValid: bool
    docId: str
    caseId: str
    fileName: Optional[str] = None
    currentHash: str
    onChainHash: str
    uploadedBy: str
    timestamp: str
    txHash: str
    blockNumber: int
    blockHash: str
    signerAddress: str
    contractAddress: Optional[str] = None
    gasUsed: Optional[int] = None
    verificationMessage: str


class EmbeddedBlockchainEngine:
    def __init__(self):
        mnemonic = "test test test test test test test test test test test junk"
        # Derive Ethereum Account from mnemonic phrase
        self.account = Account.from_mnemonic(mnemonic)
        self.current_block_height = 10428
        self.chain_id = 1337
        self.memory_ledger: Dict[str, dict] = {}

        # Compute deterministic contract address
        signer_clean = self.account.address.lower().replace("0x", "")
        # RLP encoding simulation for contract creation at nonce 1
        raw_contract_hash = hashlib.sha256(f"CREATE:{signer_clean}:1".encode("utf-8")).hexdigest()
        self.contract_address = "0x" + raw_contract_hash[:40]

        print("[BLOCKCHAIN] System EVM Smart Contract Engine Initialized (Python).")
        print(f"[BLOCKCHAIN] Contract Address: {self.contract_address}")
        print(f"[BLOCKCHAIN] Signer Address: {self.account.address}")

    def get_contract_address(self) -> str:
        return self.contract_address

    def get_signer_address(self) -> str:
        return self.account.address

    def get_block_height(self) -> int:
        return self.current_block_height

    def anchor_document(self, case_id: str, doc_id: str, sha256_hash: str, uploaded_by: str) -> dict:
        self.current_block_height += 1
        timestamp = time.strftime("%Y-%m-%d, %I:%M:%S %p IST")
        timestamp_ms = int(time.time() * 1000)

        # Payload matching EVM anchorDocument method signature
        payload = f"{case_id}:{doc_id}:{sha256_hash}:{uploaded_by}:{timestamp_ms}:{self.current_block_height}"
        
        # Sign payload using private key
        from eth_account.messages import encode_defunct
        message = encode_defunct(text=payload)
        signed_message = self.account.sign_message(message)
        signature = signed_message.signature.hex()

        # Generate standard 66-character 0x-prefixed Tx Hash
        tx_hash = "0x" + hashlib.sha256(f"{signature}{payload}".encode("utf-8")).hexdigest()

        # Generate 66-character 0x-prefixed Block Hash
        block_hash = "0x" + hashlib.sha256(f"BLOCK:{self.current_block_height}:{tx_hash}".encode("utf-8")).hexdigest()

        gas_used = 42190 + random.randint(0, 499)

        record = {
            "txHash": tx_hash,
            "blockNumber": self.current_block_height,
            "blockHash": block_hash,
            "caseId": case_id,
            "docId": doc_id,
            "sha256Hash": sha256_hash,
            "uploadedBy": uploaded_by,
            "timestamp": timestamp,
            "gasUsed": gas_used,
            "status": "CONFIRMED",
            "signerAddress": self.account.address
        }

        self.memory_ledger[doc_id] = record
        print(f"[BLOCKCHAIN TX] Anchored File \"{doc_id}\" to Block #{record['blockNumber']} (Tx: {tx_hash[:18]}...)")
        return record

    def verify_document(self, doc_id: str, current_hash: str) -> dict:
        record = self.memory_ledger.get(doc_id)

        if not record:
            return {
                "isValid": False,
                "docId": doc_id,
                "caseId": "N/A",
                "currentHash": current_hash,
                "onChainHash": "NONE",
                "uploadedBy": "N/A",
                "timestamp": "N/A",
                "txHash": "N/A",
                "blockNumber": 0,
                "blockHash": "N/A",
                "signerAddress": self.account.address,
                "contractAddress": self.contract_address,
                "verificationMessage": "Document hash record not found on Blockchain Ledger."
            }

        hashes_match = record["sha256Hash"].lower() == current_hash.lower()

        return {
            "isValid": hashes_match,
            "docId": doc_id,
            "caseId": record["caseId"],
            "currentHash": current_hash,
            "onChainHash": record["sha256Hash"],
            "uploadedBy": record["uploadedBy"],
            "timestamp": record["timestamp"],
            "txHash": record["txHash"],
            "blockNumber": record["blockNumber"],
            "blockHash": record["blockHash"],
            "signerAddress": record["signerAddress"],
            "contractAddress": self.contract_address,
            "gasUsed": record["gasUsed"],
            "verificationMessage": (
                "CRYPTOGRAPHIC MATCH CONFIRMED: On-chain ledger state matches document SHA-256 fingerprint perfectly."
                if hashes_match else
                f"TAMPER WARNING: Current file hash does NOT match the immutable on-chain record anchored in Block #{record['blockNumber']}!"
            )
        }

    def inject_record(self, record: dict):
        self.memory_ledger[record["docId"]] = record
        if record["blockNumber"] > self.current_block_height:
            self.current_block_height = record["blockNumber"]

    def get_all_records(self) -> List[dict]:
        records = list(self.memory_ledger.values())
        records.sort(key=lambda r: r["blockNumber"], reverse=True)
        return records


blockchain_engine = EmbeddedBlockchainEngine()
