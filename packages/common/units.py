COIN = 100_000_000


def sats_to_btc(sats: int) -> float:
    """Convert satoshis to BTC."""
    return sats / COIN


def btc_to_sats(btc: float) -> int:
    """Convert BTC to satoshis."""
    return round(btc * COIN)


def detect_script_type(
    script_hex: str | None = None, address: str | None = None, asm: str | None = None
) -> str:
    """Detect Bitcoin script type from scriptPubKey hex, ASM or address format."""
    addr = address.strip() if address else ""

    script = (script_hex or "").lower()
    script_asm = (asm or "").upper()

    # Address prefixes check
    if addr:
        if addr.startswith(("bc1q", "tb1q")):
            if len(addr) == 42:
                return "p2wpkh"
            elif len(addr) == 62:
                return "p2wsh"
        elif addr.startswith("bcrt1q"):
            if len(addr) == 44:
                return "p2wpkh"
            elif len(addr) == 64:
                return "p2wsh"
        elif addr.startswith(("bc1p", "tb1p", "bcrt1p")):
            return "p2tr"
        elif addr.startswith(("1", "m", "n")):
            return "p2pkh"
        elif addr.startswith(("3", "2")):
            return "p2sh"

    # Hex checks
    if script.startswith("6a"):
        return "nulldata"  # OP_RETURN
    if script.startswith("76a914") and script.endswith("88ac") and len(script) == 50:
        return "p2pkh"
    if script.startswith("a914") and script.endswith("87") and len(script) == 46:
        return "p2sh"
    if script.startswith("0014") and len(script) == 44:
        return "p2wpkh"
    if script.startswith("0020") and len(script) == 68:
        return "p2wsh"
    if script.startswith("5120") and len(script) == 68:
        return "p2tr"
    if "OP_CHECKMULTISIG" in script_asm or "multisig" in script_asm.lower():
        return "multisig"

    return "nonstandard"


def is_dust(value_sats: int, threshold: int = 546) -> bool:
    """Check if output value is at or below Bitcoin dust threshold."""
    return 0 < value_sats <= threshold


def is_round_amount(value_sats: int) -> bool:
    """Check if value is an exact round decimal in satoshis or BTC."""
    if value_sats <= 0:
        return False
    # Multiples of 0.1 BTC, 0.5 BTC, 1 BTC
    if value_sats % 10_000_000 == 0:
        return True
    # Multiples of 1,000, 10,000, 100,000 sats
    if value_sats >= 100_000 and value_sats % 50_000 == 0:
        return True
    return False
