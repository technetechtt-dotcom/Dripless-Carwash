import io
import json
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def money(cents, currency="ZAR"):
    return f"R {cents / 100:,.2f}" if currency == "ZAR" else f"{currency} {cents / 100:,.2f}"


def render(data):
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Dripless receipt {data['number']}",
        author="Dripless Carwash",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Right", parent=styles["BodyText"], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#64748B")))
    story = [
        Table(
            [
                [Paragraph("<b><font size=22 color='#0F766E'>DRIPLESS</font></b>", styles["Normal"]), Paragraph("<b>PAYMENT RECEIPT</b>", styles["Right"])],
                [Paragraph("Mobile carwash services", styles["BodyText"]), Paragraph(data["number"], styles["Right"])],
            ],
            colWidths=[105 * mm, 52 * mm],
        ),
        Spacer(1, 10 * mm),
        Table(
            [
                ["Issued", data["issuedAt"]],
                ["Paid", data.get("paidAt") or "Pending"],
                ["Customer", data["customerName"]],
                ["Email", data["customerEmail"]],
                ["Booking", data.get("bookingReference") or "-"]
            ],
            colWidths=[35 * mm, 122 * mm],
            style=TableStyle([
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]),
        ),
        Spacer(1, 9 * mm),
        Table(
            [["Description", "Amount"], [data["description"], money(data["totalCents"], data["currency"])]],
            colWidths=[120 * mm, 37 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        ),
        Spacer(1, 7 * mm),
        Table(
            [
                ["Subtotal", money(data["subtotalCents"], data["currency"])],
                ["VAT", money(data["taxCents"], data["currency"])],
                [Paragraph("<b>Total paid</b>", styles["BodyText"]), Paragraph(f"<b>{money(data['totalCents'], data['currency'])}</b>", styles["Right"])],
            ],
            colWidths=[120 * mm, 37 * mm],
            style=TableStyle([
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LINEABOVE", (0, 2), (-1, 2), 1, colors.HexColor("#0F766E")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]),
        ),
        Spacer(1, 18 * mm),
        Paragraph("Thank you for choosing a water-conscious wash.", styles["BodyText"]),
        Spacer(1, 3 * mm),
        Paragraph(
            f"Payment provider: {data['provider']} | Payment reference: {data['paymentReference']}",
            styles["Small"],
        ),
    ]
    if data.get("vatNumber"):
        story.append(Paragraph(f"VAT number: {data['vatNumber']}", styles["Small"]))
    document.build(story)
    return output.getvalue()


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    sys.stdout.buffer.write(render(payload))
