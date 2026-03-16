import { db } from '../db';
import { taxProfiles, taxRules, taxConfiguration } from '@shared/schema';
import { eq, and, lte, gte, sql, or } from 'drizzle-orm';

export interface TaxCalculationRequest {
  profileCode?: string;
  materialCode: string;
  customerCode?: string;
  shipToCountry?: string;
  shipToState?: string;
  shipToCounty?: string;
  shipToCity?: string;
  baseAmount: number;
  quantity: number;
  transactionDate: Date;
  taxType: 'INPUT' | 'OUTPUT' | 'WITHHOLDING';
}

export interface TaxCalculationResult {
  profileCode: string;
  profileName: string;
  appliedRules: AppliedTaxRule[];
  totalTaxAmount: number;
  totalAmount: number;
  netAmount: number;
}

export interface AppliedTaxRule {
  ruleCode: string;
  title: string;
  ratePercent: number;
  appliesTo: string;
  jurisdiction: string;
  taxAmount: number;
  postingAccount?: string;
}

/**
 * Tax Calculation Service
 * Follows standard ERP tax determination logic without SAP terminology
 */
export class TaxCalculationService {

  /**
   * Calculate tax for a transaction
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    // Step 1: Determine applicable tax profile
    const profile = await this.determineTaxProfile(request);

    if (!profile) {
      throw new Error('No applicable tax profile found for this transaction');
    }

    // Step 2: Get applicable tax rules based on jurisdiction and material
    const applicableRules = await this.getApplicableTaxRules(
      profile.id,
      request.transactionDate,
      request.shipToCountry,
      request.shipToState,
      request.shipToCounty,
      request.shipToCity
    );

    // Step 3: Apply each tax rule
    const appliedRules: AppliedTaxRule[] = [];
    let totalTaxAmount = 0;
    const baseAmount = request.baseAmount * request.quantity;

    for (const rule of applicableRules) {
      const taxAmount = baseAmount * (rule.ratePercent / 100);
      totalTaxAmount += taxAmount;

      appliedRules.push({
        ruleCode: rule.ruleCode,
        title: rule.title,
        ratePercent: rule.ratePercent,
        appliesTo: rule.appliesTo || '',
        jurisdiction: rule.jurisdiction || '',
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        postingAccount: rule.postingAccount || undefined
      });
    }

    return {
      profileCode: profile.profileCode,
      profileName: profile.name,
      appliedRules,
      totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
      totalAmount: parseFloat((baseAmount + totalTaxAmount).toFixed(2)),
      netAmount: parseFloat(baseAmount.toFixed(2))
    };
  }

  /**
   * Determine applicable tax profile based on transaction context
   */
  private async determineTaxProfile(request: TaxCalculationRequest) {
    // Priority 1: Explicit profile code provided
    if (request.profileCode) {
      const [profile] = await db
        .select()
        .from(taxProfiles)
        .where(and(
          eq(taxProfiles.profileCode, request.profileCode.toUpperCase()),
          eq(taxProfiles.isActive, true)
        ))
        .limit(1);

      return profile;
    }

    // Priority 2: Country-based profile (most common)
    if (request.shipToCountry) {
      const [profile] = await db
        .select()
        .from(taxProfiles)
        .where(and(
          eq(taxProfiles.country, request.shipToCountry.toUpperCase()),
          eq(taxProfiles.isActive, true)
        ))
        .limit(1);

      if (profile) return profile;
    }

    // Priority 3: Get default profile
    const [profile] = await db
      .select()
      .from(taxProfiles)
      .where(eq(taxProfiles.isActive, true))
      .orderBy(taxProfiles.id)
      .limit(1);

    return profile;
  }

  /**
   * Get applicable tax rules based on jurisdiction
   */
  private async getApplicableTaxRules(
    profileId: number,
    transactionDate: Date,
    country?: string,
    state?: string,
    county?: string,
    city?: string
  ) {
    // Build jurisdiction matching logic
    const conditions = [eq(taxRules.profileId, profileId), eq(taxRules.isActive, true)];

    // Date range filter
    conditions.push(
      or(
        eq(taxRules.effectiveTo, null),
        gte(taxRules.effectiveTo, transactionDate)
      )
    );
    conditions.push(
      lte(taxRules.effectiveFrom, transactionDate)
    );

    // Jurisdiction filters (optional)
    if (country) {
      conditions.push(
        or(
          eq(taxRules.jurisdiction, country.toUpperCase()),
          sql`${taxRules.jurisdiction} IS NULL`
        )
      );
    }

    const rules = await db
      .select()
      .from(taxRules)
      .where(and(...conditions));

    // Sort by specificity (specific jurisdiction first)
    return rules.sort((a, b) => {
      const aSpecific = a.jurisdiction ? a.jurisdiction.length : 0;
      const bSpecific = b.jurisdiction ? b.jurisdiction.length : 0;
      return bSpecific - aSpecific;
    });
  }

  /**
   * Get tax rate for a specific combination
   */
  async getTaxRate(
    profileCode: string,
    ruleCode: string
  ): Promise<number> {
    const [rule] = await db
      .select({ ratePercent: taxRules.ratePercent })
      .from(taxRules)
      .innerJoin(taxProfiles, eq(taxRules.profileId, taxProfiles.id))
      .where(and(
        eq(taxProfiles.profileCode, profileCode.toUpperCase()),
        eq(taxRules.ruleCode, ruleCode.toUpperCase()),
        eq(taxRules.isActive, true)
      ))
      .limit(1);

    return rule ? parseFloat(rule.ratePercent) : 0;
  }

  /**
   * Validate tax configuration completeness
   */
  async validateTaxSetup(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if at least one active profile exists
    const profiles = await db
      .select()
      .from(taxProfiles)
      .where(eq(taxProfiles.isActive, true))
      .limit(1);

    if (profiles.length === 0) {
      issues.push('No active tax profiles configured');
    }

    // Check if profiles have rules
    for (const profile of profiles) {
      const rules = await db
        .select()
        .from(taxRules)
        .where(and(
          eq(taxRules.profileId, profile.id),
          eq(taxRules.isActive, true)
        ))
        .limit(1);

      if (rules.length === 0) {
        issues.push(`Tax profile "${profile.name}" has no active rules`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get all tax profiles with rule counts
   */
  async getAllTaxProfilesWithDetails() {
    const profiles = await db
      .select()
      .from(taxProfiles)
      .orderBy(taxProfiles.profileCode);

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const rules = await db
          .select()
          .from(taxRules)
          .where(and(
            eq(taxRules.profileId, profile.id),
            eq(taxRules.isActive, true)
          ));

        return {
          ...profile,
          ruleCount: rules.length,
          rules: rules
        };
      })
    );

    return results;
  }
}

export const taxCalculationService = new TaxCalculationService();

