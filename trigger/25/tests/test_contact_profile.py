from app.utils.contact_profile import format_contact_profile


def test_format_contact_profile_empty() -> None:
    assert format_contact_profile() == ""
    assert format_contact_profile(relation="  ", notes=None) == ""


def test_format_contact_profile_relation_only() -> None:
    text = format_contact_profile(relation="esposa")
    assert "Sobre este contato:" in text
    assert "- Relação: esposa" in text
    assert "Notas" not in text


def test_format_contact_profile_caps_length() -> None:
    text = format_contact_profile(relation="x" * 100, notes="y" * 600)
    assert len(text.split("Relação: ", 1)[1].split("\n", 1)[0]) == 64
    assert len(text.split("Notas: ", 1)[1]) == 500
