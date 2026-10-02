"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  Users,
  Ship,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  PackagePlus,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LineItem {
  id: string;
  product_code: string;
  description: string;
  quantity: number | "";
  unit: string;
}

interface SupplierOption {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  iso_certified: boolean;
}

export default function NewRFQPage() {
  const router = useRouter();
  const toast = useToast();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{
    suppliers: SupplierOption[];
    categories: string[];
    currencies: string[];
    units: string[];
    payment_terms_options: string[];
    dispatch_methods: string[];
    shipment_types: string[];
  }>({
    suppliers: [],
    categories: [],
    currencies: ["INR", "USD", "EUR"],
    units: ["EACH", "PCS", "SETS", "LOT", "METRIC_TON", "KG"],
    payment_terms_options: ["Net 30 Days", "Net 45 Days", "100% Advance", "LC"],
    dispatch_methods: ["Road Freight Express", "Ocean Freight", "Air Cargo"],
    shipment_types: ["FCL (Full Container)", "LCL (Less Container)", "Courier Express"],
  });

  // RFQ Details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [currency, setCurrency] = useState("INR");
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().split("T")[0]);
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState("");
  const [description, setDescription] = useState("");

  // Buyer Details
  const [buyerCompany, setBuyerCompany] = useState("ProcuraPilot Industrial Operations Ltd");
  const [buyerContactPerson, setBuyerContactPerson] = useState("Faisal Sakware");
  const [buyerEmail, setBuyerEmail] = useState("buyer@procurapilot.ai");
  const [buyerPhone, setBuyerPhone] = useState("+91 22 4910 8800");
  const [buyerAddress, setBuyerAddress] = useState("Plot 12, Phase 1, Hinjawadi Tech Park, Pune, Maharashtra 411057");

  // Commercial / Delivery
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [dispatchMethod, setDispatchMethod] = useState("Road Freight Express");
  const [shipmentType, setShipmentType] = useState("FCL (Full Container)");
  const [portOfLoading, setPortOfLoading] = useState("Nhava Sheva (JNPT), Mumbai");
  const [portOfDischarge, setPortOfDischarge] = useState("Delivery Site Pune");
  const [deliveryLocation, setDeliveryLocation] = useState("Warehouse Dock 4, Hinjawadi SCM Hub, Pune");
  const [additionalTerms, setAdditionalTerms] = useState(
    "1. Quotation prices must include standard export packaging.\n2. Invoices will be matched against Purchase Orders and Receipt Notes via automated three-way matching.\n3. Goods are subject to incoming inspection & ASTM material validation."
  );

  // Selected Supplier IDs
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "item-1",
      product_code: "B-STOOL",
      description: "Bar stool, heavy-duty brushed aluminum & 316 stainless steel frame",
      quantity: 150,
      unit: "EACH",
    },
    {
      id: "item-2",
      product_code: "B-TABLE",
      description: "Bar table, industrial stainless steel pedestal with anti-corrosion coating",
      quantity: 75,
      unit: "EACH",
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await api.getRFQOptions();
        setOptions(data);
        if (data.categories?.length && !category) {
          setCategory(data.categories[0]);
        }
        if (data.suppliers?.length) {
          // Pre-select first 3 suppliers as default invites for buyer convenience
          setSelectedSupplierIds(data.suppliers.slice(0, 3).map((s) => s.id));
        }
      } catch (err: any) {
        console.warn("Could not load backend RFQ options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  const handleToggleSupplier = (id: number) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAllSuppliers = () => {
    if (selectedSupplierIds.length === options.suppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(options.suppliers.map((s) => s.id));
    }
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      product_code: "",
      description: "",
      quantity: 100,
      unit: "EACH",
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) {
      toast.warning("Line Item Required", "At least one item specification is required in an RFQ.");
      return;
    }
    setLineItems((prev) => prev.filter((itm) => itm.id !== id));
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((itm) => (itm.id === id ? { ...itm, [field]: value } : itm))
    );
  };

  const handleLoadSampleItems = () => {
    setLineItems([
      {
        id: "item-1",
        product_code: "B-STOOL",
        description: "Bar stool, brushed aluminum and 316 stainless steel frame",
        quantity: 150,
        unit: "EACH",
      },
      {
        id: "item-2",
        product_code: "B-TABLE",
        description: "Bar table, industrial stainless steel pedestal with anti-corrosion coating",
        quantity: 75,
        unit: "EACH",
      },
      {
        id: "item-3",
        product_code: "B-CUSHION",
        description: "Weatherproof high-density polyurethane seat cushion modules",
        quantity: 225,
        unit: "SETS",
      },
    ]);
    toast.info("Sample Items Loaded", "Populated sample bar stool and furniture specifications.");
  };

  const handleSubmit = async (generate: boolean) => {
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError("Please enter an RFQ Title.");
      toast.error("Validation Error", "RFQ Title is required.");
      return;
    }

    if (generate) {
      if (!submissionDeadline) {
        setFormError("Please specify a Quote Submission Deadline to publish the RFQ.");
        toast.error("Validation Error", "Quote Submission Deadline is required.");
        return;
      }
      if (selectedSupplierIds.length === 0) {
        setFormError("Please select at least one supplier to invite.");
        toast.error("Validation Error", "At least one supplier must be invited.");
        return;
      }
      const invalidItems = lineItems.filter(
        (itm) => !itm.product_code.trim() || !itm.description.trim() || !itm.quantity || Number(itm.quantity) <= 0
      );
      if (invalidItems.length > 0) {
        setFormError("All line items must have a Product Code, Description, and Quantity > 0.");
        toast.error("Validation Error", "Incomplete line items found.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category: category || "General Procurement",
        budget: budget ? Number(budget) : null,
        currency,
        rfq_date: rfqDate || null,
        submission_deadline: submissionDeadline || null,
        required_delivery_date: requiredDeliveryDate || null,
        buyer_company: buyerCompany.trim() || null,
        buyer_contact_person: buyerContactPerson.trim() || null,
        buyer_email: buyerEmail.trim() || null,
        buyer_phone: buyerPhone.trim() || null,
        buyer_address: buyerAddress.trim() || null,
        payment_terms: paymentTerms || null,
        dispatch_method: dispatchMethod || null,
        shipment_type: shipmentType || null,
        port_of_loading: portOfLoading || null,
        port_of_discharge: portOfDischarge || null,
        delivery_location: deliveryLocation || null,
        additional_terms: additionalTerms.trim() || null,
        items: lineItems.map((itm) => ({
          product_code: itm.product_code.trim(),
          description: itm.description.trim(),
          quantity: Number(itm.quantity),
          unit: itm.unit.trim().toUpperCase(),
        })),
        supplier_ids: selectedSupplierIds,
        generate,
      };

      const createdRFQ = await api.createRFQ(payload);

      toast.success(
        generate ? "RFQ Published Successfully" : "Draft RFQ Saved",
        generate
          ? `Generated RFQ #${createdRFQ.rfq_number} with ${createdRFQ.items?.length || 0} line items and ${createdRFQ.invited_suppliers?.length || 0} invited suppliers.`
          : `Saved draft RFQ #${createdRFQ.id}.`
      );

      router.push(`/rfq/${createdRFQ.id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create RFQ");
      toast.error("Error", err.message || "Failed to submit RFQ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to RFQ Workspaces</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Structured Procurement Intake</span>
          </div>
        </div>

        {/* Title Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Create Request for Quotation (RFQ)
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              Define technical specifications, line items, buyer terms, and select invited vendors. The system will automatically generate a traceable RFQ number, store all records in PostgreSQL, and build an audit-ready PDF.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadSampleItems}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              Fill Sample Data
            </button>
          </div>
        </div>

        {formError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{formError}</span>
          </div>
        )}

        {/* SECTION 1: RFQ DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">RFQ Identification & Budget</h2>
              <p className="text-[11px] text-slate-500">Core parameters, category, and procurement budget</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RFQ Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Commercial Grade Aluminum & Stainless Bar Stools and High Tables"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sourcing Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                {options.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocated Budget
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 2500000"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  {options.currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quote Submission Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Delivery Deadline
              </label>
              <input
                type="date"
                value={requiredDeliveryDate}
                onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Scope / High-Level Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-volume contract for outdoor/indoor bar seating furniture across manufacturing campus..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: BUYER DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Buyer Organization Details</h2>
              <p className="text-[11px] text-slate-500">Contact person and procurement delivery address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={buyerCompany}
                onChange={(e) => setBuyerCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={buyerContactPerson}
                onChange={(e) => setBuyerContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Buyer Email
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / Facility Location
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SUPPLIER INVITATIONS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Select Invited Suppliers ({selectedSupplierIds.length} Selected)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Only invited suppliers will be permitted to submit quotations for this RFQ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAllSuppliers}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {selectedSupplierIds.length === options.suppliers.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.suppliers.map((sup) => {
              const isSelected = selectedSupplierIds.includes(sup.id);
              return (
                <div
                  key={sup.id}
                  onClick={() => handleToggleSupplier(sup.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{sup.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>{sup.country || "Global"}</span>
                        {sup.iso_certified && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              ISO 9001
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isSelected ? "Invited" : "Not Invited"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: COMMERCIAL & LOGISTICS TERMS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Commercial & Shipping Terms</h2>
              <p className="text-[11px] text-slate-500">Payment milestones, freight dispatch, and delivery terms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                {options.payment_terms_options.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatch Method
              </label>
              <select
                value={dispatchMethod}
                onChange={(e) => setDispatchMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                {options.dispatch_methods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shipment Type
              </label>
              <select
                value={shipmentType}
                onChange={(e) => setShipmentType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                {options.shipment_types.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Port of Loading
              </label>
              <input
                type="text"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value)}
                placeholder="e.g. Nhava Sheva (JNPT) / Hamburg / Chicago"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Port of Discharge
              </label>
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value)}
                placeholder="e.g. Pune Logistics Inland Hub"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Delivery Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. Factory Site Dock 4, Pune"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Terms & Conditions / Special Instructions for Bidders
              </label>
              <textarea
                rows={2}
                value={additionalTerms}
                onChange={(e) => setAdditionalTerms(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: DYNAMIC LINE ITEMS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  RFQ Line Items ({lineItems.length} Products)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Add product codes, technical descriptions, quantities, and units
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddLineItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 font-mono">
                    Item #{idx + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Product Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.product_code}
                      onChange={(e) => handleLineItemChange(item.id, "product_code", e.target.value)}
                      placeholder="e.g. B-STOOL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-bold uppercase"
                      required
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Technical Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
                      placeholder="e.g. Bar stool, aluminum, stainless steel"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(item.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleLineItemChange(item.id, "unit", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                    >
                      {options.units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for transactional commit to PostgreSQL and PDF generation.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/rfq"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold text-center transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Save as Draft
            </button>

            <button
              id="btn-generate-rfq"
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? "Generating RFQ..." : "Generate RFQ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
