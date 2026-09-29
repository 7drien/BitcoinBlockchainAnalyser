from packages.common.units import (
    btc_to_sats,
    detect_script_type,
    is_dust,
    is_round_amount,
    sats_to_btc,
)


def test_sats_to_btc_conversion():
    assert sats_to_btc(100_000_000) == 1.0
    assert sats_to_btc(50_000_000) == 0.5
    assert sats_to_btc(546) == 0.00000546
    assert sats_to_btc(0) == 0.0


def test_btc_to_sats_conversion():
    assert btc_to_sats(1.0) == 100_000_000
    assert btc_to_sats(0.12345678) == 12345678
    assert btc_to_sats(0.0) == 0


def test_detect_script_type_from_address():
    # SegWit v0 (P2WPKH - 42 chars)
    assert detect_script_type(address="bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4") == "p2wpkh"
    # SegWit v1 (P2TR - 62 chars)
    assert (
        detect_script_type(address="bc1p5d7rjq7g6rdk2yhzks9s2uma66dn3x5aftypmnea5jj0qzkffwuq5vqncr")
        == "p2tr"
    )
    # Legacy P2PKH
    assert detect_script_type(address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa") == "p2pkh"
    # P2SH
    assert detect_script_type(address="3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy") == "p2sh"
    # Regtest addresses
    assert detect_script_type(address="bcrt1q8x9y7z2a3b4c5d6e7f8g9h0j1k2l3m4n5o6p7q") == "p2wpkh"


def test_detect_script_type_from_hex():
    # OP_RETURN
    assert detect_script_type(script_hex="6a14010203") == "nulldata"
    # P2PKH hex: 76a914 ... 88ac (50 hex chars = 25 bytes)
    p2pkh_hex = "76a914" + "a" * 40 + "88ac"
    assert detect_script_type(script_hex=p2pkh_hex) == "p2pkh"
    # P2SH hex: a914 ... 87 (46 hex chars = 23 bytes)
    p2sh_hex = "a914" + "b" * 40 + "87"
    assert detect_script_type(script_hex=p2sh_hex) == "p2sh"
    # P2WPKH hex: 0014 ... (44 hex chars = 22 bytes)
    p2wpkh_hex = "0014" + "c" * 40
    assert detect_script_type(script_hex=p2wpkh_hex) == "p2wpkh"


def test_is_dust():
    assert is_dust(546) is True
    assert is_dust(545) is True
    assert is_dust(1) is True
    assert is_dust(547) is False
    assert is_dust(10_000) is False
    assert is_dust(0) is False  # 0 is not dust (e.g. OP_RETURN)


def test_is_round_amount():
    assert is_round_amount(100_000_000) is True  # 1 BTC
    assert is_round_amount(50_000_000) is True  # 0.5 BTC
    assert is_round_amount(10_000_000) is True  # 0.1 BTC
    assert is_round_amount(150_000) is True  # multiple of 50k
    assert is_round_amount(123_456) is False
    assert is_round_amount(0) is False
