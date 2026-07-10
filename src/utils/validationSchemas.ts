import * as z from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  phone: z.string().min(7, 'Phone must be at least 7 characters').max(20, 'Phone must be less than 20 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200, 'Address must be less than 200 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export const inventorySchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100, 'Item name must be less than 100 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category must be less than 50 characters'),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit must be less than 20 characters'),
  quantity: z.number().min(0, 'Quantity cannot be negative').max(1000000, 'Quantity is too large'),
  purchasePrice: z.number().min(0, 'Price cannot be negative').max(1000000, 'Price is too large'),
  vendor: z.string().max(100, 'Vendor name must be less than 100 characters').optional().or(z.literal('')),
});

export const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters').max(100, 'Vendor name must be less than 100 characters'),
  phone: z.string().min(7, 'Phone must be at least 7 characters').max(20, 'Phone must be less than 20 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200, 'Address must be less than 200 characters'),
  panNumber: z.string().max(20, 'PAN number must be less than 20 characters').optional().or(z.literal('')),
});

export const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(1000000, 'Amount is too large'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional().or(z.literal('')),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
});

export const billItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100, 'Item name must be less than 100 characters'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(1000000, 'Quantity is too large'),
  unitPrice: z.number().min(0.01, 'Price must be greater than 0').max(1000000, 'Price is too large'),
  discount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
});

export const billSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  items: z.array(billItemSchema).min(1, 'Bill must have at least one item'),
});

export const companySettingsSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name must be less than 100 characters'),
  panNumber: z.string().max(20, 'PAN number must be less than 20 characters'),
  vatNumber: z.string().max(20, 'VAT number must be less than 20 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(500, 'Address must be less than 500 characters'),
  contactNumber: z.string().min(7, 'Contact number must be at least 7 characters').max(20, 'Contact number must be less than 20 characters'),
  email: z.string().email('Invalid email address'),
  vatRate: z.number().min(0, 'VAT rate cannot be negative').max(100, 'VAT rate cannot exceed 100%').optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type BillItemInput = z.infer<typeof billItemSchema>;
export type BillInput = z.infer<typeof billSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
