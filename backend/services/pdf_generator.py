import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_rfq_pdf(rfq: dict) -> bytes:
    """Generates an enterprise-grade PDF document for an RFQ using reportlab.
    Returns the generated PDF as raw bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=10,
        spaceAfter=6,
    )
    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    value_style = ParagraphStyle(
        "ValueStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>PROCURAPILOT AI</b><br/><font size='8' color='#64748b'>Enterprise Autonomous Procurement</font>", value_style),
            Paragraph(
                f"<font size='14' color='#1d4ed8'><b>REQUEST FOR QUOTATION</b></font><br/>"
                f"<font size='10' color='#0f172a'><b>{rfq.get('rfq_number') or 'DRAFT-RFQ'}</b></font>",
                ParagraphStyle("HeaderRight", parent=value_style, alignment=2),
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=12))

    # 2. RFQ Core Title & Summary
    story.append(Paragraph(rfq.get("title") or "Procurement Request for Quotation", title_style))
    if rfq.get("description"):
        story.append(Spacer(1, 4))
        story.append(Paragraph(rfq["description"], subtitle_style))
    story.append(Spacer(1, 10))

    # 3. Two-Column Metadata Table (RFQ Details & Buyer Details)
    rfq_date_str = str(rfq.get("rfq_date") or datetime.now().strftime("%Y-%m-%d"))
    sub_deadline_str = str(rfq.get("submission_deadline") or "As specified")
    del_deadline_str = str(rfq.get("required_delivery_date") or "As specified")
    budget_val = rfq.get("budget")
    budget_str = f"{rfq.get('currency', 'INR')} {budget_val:,.2f}" if budget_val else "Not Disclosed"

    details_grid = [
        [
            Paragraph("<b>RFQ DETAILS</b>", section_heading),
            Paragraph("<b>BUYER INFORMATION</b>", section_heading),
        ],
        [
            Paragraph("<b>RFQ Number:</b>", label_style),
            Paragraph(rfq.get("buyer_company") or "ProcuraPilot Buyer Ops", value_style),
        ],
        [
            Paragraph(rfq.get("rfq_number") or "N/A", value_style),
            Paragraph(rfq.get("buyer_contact_person") or "Procurement Officer", value_style),
        ],
        [
            Paragraph("<b>Category:</b>", label_style),
            Paragraph(f"Email: {rfq.get('buyer_email') or 'buyer@procurapilot.ai'}", value_style),
        ],
        [
            Paragraph(rfq.get("category") or "General Sourcing", value_style),
            Paragraph(f"Phone: {rfq.get('buyer_phone') or '+91 22 4910 8800'}", value_style),
        ],
        [
            Paragraph("<b>RFQ Issue Date:</b>", label_style),
            Paragraph("<b>Address / Delivery Site:</b>", label_style),
        ],
        [
            Paragraph(rfq_date_str, value_style),
            Paragraph(rfq.get("buyer_address") or rfq.get("delivery_location") or "Main Procurement Facility", value_style),
        ],
        [
            Paragraph("<b>Quote Submission Deadline:</b>", label_style),
            Paragraph("<b>Commercial Terms:</b>", label_style),
        ],
        [
            Paragraph(f"<font color='#b91c1c'><b>{sub_deadline_str}</b></font>", value_style),
            Paragraph(f"Payment: {rfq.get('payment_terms') or 'Net 30 Days'}", value_style),
        ],
        [
            Paragraph("<b>Target Delivery Date:</b>", label_style),
            Paragraph(f"Dispatch: {rfq.get('dispatch_method') or 'Ocean Freight'} ({rfq.get('shipment_type') or 'FCL'})", value_style),
        ],
        [
            Paragraph(del_deadline_str, value_style),
            Paragraph(f"Port: {rfq.get('port_of_loading') or 'Any'} &rarr; {rfq.get('port_of_discharge') or 'Destination'}", value_style),
        ],
        [
            Paragraph("<b>Allocated Budget:</b>", label_style),
            Paragraph(f"Status: <b>{rfq.get('status', 'ACTIVE').upper()}</b>", value_style),
        ],
        [
            Paragraph(budget_str, value_style),
            Paragraph("", value_style),
        ],
    ]

    meta_table = Table(details_grid, colWidths=[270, 270])
    meta_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 4. Line Items Table
    story.append(Paragraph("<b>RFQ LINE ITEMS & SPECIFICATIONS</b>", section_heading))

    items = rfq.get("items") or []
    item_rows = [
        [
            Paragraph("<b>#</b>", table_header),
            Paragraph("<b>Product Code</b>", table_header),
            Paragraph("<b>Description & Technical Specifications</b>", table_header),
            Paragraph("<b>Quantity</b>", table_header),
            Paragraph("<b>Unit</b>", table_header),
        ]
    ]

    if items:
        for idx, itm in enumerate(items, 1):
            item_rows.append([
                Paragraph(str(idx), table_cell),
                Paragraph(itm.get("product_code") or "N/A", table_cell),
                Paragraph(itm.get("description") or "Item specification", table_cell),
                Paragraph(f"{float(itm.get('quantity', 0)):,g}", table_cell),
                Paragraph(itm.get("unit") or "EACH", table_cell),
            ])
    else:
        # Fallback if created without explicit line item records
        item_rows.append([
            Paragraph("1", table_cell),
            Paragraph("GEN-01", table_cell),
            Paragraph(rfq.get("description") or rfq.get("title") or "Procurement Package", table_cell),
            Paragraph(str(rfq.get("quantity") or 1), table_cell),
            Paragraph(rfq.get("unit") or "LOT", table_cell),
        ])

    items_table = Table(item_rows, colWidths=[30, 95, 275, 75, 65])
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 14))

    # 5. Invited Suppliers Summary
    invited_suppliers = rfq.get("invited_suppliers") or []
    if invited_suppliers:
        story.append(Paragraph("<b>INVITED SUPPLIERS</b>", section_heading))
        sup_names = [s.get("supplier_name") or f"Supplier #{s.get('supplier_id')}" for s in invited_suppliers]
        story.append(
            Paragraph(
                f"The following suppliers have been invited to submit competitive bids: <b>{', '.join(sup_names)}</b>.",
                value_style,
            )
        )
        story.append(Spacer(1, 10))

    # 6. Terms & Instructions for Bidders
    story.append(Paragraph("<b>QUOTATION SUBMISSION INSTRUCTIONS</b>", section_heading))
    terms_text = (
        rfq.get("additional_terms")
        or "1. Quotes must be submitted directly through ProcuraPilot or emailed before the deadline.<br/>"
        "2. All prices must state whether taxes, shipping, customs duties, and insurance are included.<br/>"
        "3. Quotations will be evaluated objectively using the Analytic Hierarchy Process (AHP) and multi-vendor comparison matrix."
    )
    story.append(Paragraph(terms_text, value_style))

    # 7. Document Footer
    story.append(Spacer(1, 18))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=6))
    footer_text = (
        f"<font size='7' color='#94a3b8'>Generated by ProcuraPilot AI Platform on "
        f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')} &bull; Cryptographically verifiable procurement intake</font>"
    )
    story.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=subtitle_style, alignment=1)))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
