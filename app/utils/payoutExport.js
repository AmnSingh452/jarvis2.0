/**
 * Partner Payout Export Utilities
 * Handles CSV generation and payout management with $25 minimum threshold
 */

import prisma from '../db.server';

/**
 * Convert data to CSV format
 */
function convertToCSV(data, headers) {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Get unpaid payouts summary by agency
 * Groups all unpaid months by agency and applies $25 minimum threshold
 */
export async function getUnpaidPayoutsSummary() {
  try {
    // Get all unpaid payouts with agency info
    const unpaidPayouts = await prisma.partnerPayout.findMany({
      where: { paid: false },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            email: true,
            paymentMethod: true,
            paymentEmail: true,
            minimumPayoutThreshold: true,
          },
        },
      },
      orderBy: [
        { agencyId: 'asc' },
        { monthFor: 'desc' },
      ],
    });
    
    // Group by agency and calculate totals
    const agencySummary = {};
    
    unpaidPayouts.forEach(payout => {
      const agencyId = payout.agencyId;
      
      if (!agencySummary[agencyId]) {
        agencySummary[agencyId] = {
          agency: payout.agency,
          totalCommission: 0,
          totalGross: 0,
          months: [],
          payoutIds: [],
        };
      }
      
      agencySummary[agencyId].totalCommission += parseFloat(payout.commissionAmount);
      agencySummary[agencyId].totalGross += parseFloat(payout.grossAmount);
      agencySummary[agencyId].months.push(payout.monthFor.toISOString().slice(0, 7));
      agencySummary[agencyId].payoutIds.push(payout.id);
    });
    
    // Filter agencies meeting minimum threshold and format for export
    const payoutsToExport = Object.values(agencySummary)
      .filter(summary => summary.totalCommission >= parseFloat(summary.agency.minimumPayoutThreshold))
      .map(summary => ({
        'Partner Name': summary.agency.name,
        'Email': summary.agency.email,
        'Payment Method': summary.agency.paymentMethod || 'Not Set',
        'Payment Email': summary.agency.paymentEmail || summary.agency.email,
        'Months Included': summary.months.join('; '),
        'Gross Revenue': summary.totalGross.toFixed(2),
        'Commission (25%)': summary.totalCommission.toFixed(2),
        'Payment Reference': '',
        'Agency ID': summary.agency.id,
        'Payout IDs': summary.payoutIds.join(';'),
      }));
    
    return {
      payouts: payoutsToExport,
      totalToPay: payoutsToExport.reduce((sum, p) => sum + parseFloat(p['Commission (25%)']), 0),
      agencyCount: payoutsToExport.length,
      belowThreshold: Object.values(agencySummary).filter(
        s => s.totalCommission < parseFloat(s.agency.minimumPayoutThreshold)
      ).length,
    };
  } catch (error) {
    console.error('Error getting unpaid payouts summary:', error);
    throw error;
  }
}

/**
 * Generate CSV for unpaid partner payouts (meeting $25 minimum)
 */
export async function generatePayoutCSV(monthFor = null) {
  try {
    const summary = await getUnpaidPayoutsSummary();
    
    if (summary.payouts.length === 0) {
      return {
        success: false,
        message: `No payouts meeting minimum threshold. ${summary.belowThreshold} agencies below $25.`,
      };
    }
    
    const headers = [
      'Partner Name',
      'Email',
      'Payment Method',
      'Payment Email',
      'Months Included',
      'Gross Revenue',
      'Commission (25%)',
      'Payment Reference',
    ];
    
    const csv = convertToCSV(summary.payouts, headers);
    
    return {
      success: true,
      csv,
      count: summary.agencyCount,
      totalAmount: summary.totalToPay.toFixed(2),
      belowThreshold: summary.belowThreshold,
      metadata: summary.payouts.map(p => ({
        agencyId: p['Agency ID'],
        payoutIds: p['Payout IDs'].split(';'),
        amount: p['Commission (25%)'],
      })),
    };
  } catch (error) {
    console.error('Error generating payout CSV:', error);
    throw error;
  }
}

/**
 * Get detailed breakdown by month for a specific agency
 */
export async function getAgencyPayoutDetails(agencyId) {
  try {
    const payouts = await prisma.partnerPayout.findMany({
      where: {
        agencyId: agencyId,
        paid: false,
      },
      include: {
        agency: true,
      },
      orderBy: { monthFor: 'desc' },
    });
    
    const total = payouts.reduce((sum, p) => sum + parseFloat(p.commissionAmount), 0);
    
    return {
      agency: payouts[0]?.agency,
      payouts: payouts.map(p => ({
        id: p.id,
        month: p.monthFor.toISOString().slice(0, 7),
        grossAmount: parseFloat(p.grossAmount),
        commissionAmount: parseFloat(p.commissionAmount),
      })),
      totalCommission: total,
      meetsThreshold: total >= parseFloat(payouts[0]?.agency?.minimumPayoutThreshold || 25),
    };
  } catch (error) {
    console.error('Error getting agency payout details:', error);
    throw error;
  }
}

/**
 * Mark payouts as paid
 */
export async function markPayoutsPaid(payoutIds, paymentReference, paymentMethod = 'manual') {
  try {
    const result = await prisma.partnerPayout.updateMany({
      where: {
        id: { in: payoutIds },
        paid: false, // Only update unpaid payouts
      },
      data: {
        paid: true,
        paymentReference: paymentReference,
        paymentMethod: paymentMethod,
        paidAt: new Date(),
      },
    });
    
    console.log(`✅ Marked ${result.count} payouts as paid with reference: ${paymentReference}`);
    return result.count;
  } catch (error) {
    console.error('Error marking payouts as paid:', error);
    throw error;
  }
}

/**
 * Get agencies below minimum threshold
 */
export async function getAgenciesBelowThreshold() {
  try {
    const unpaidPayouts = await prisma.partnerPayout.findMany({
      where: { paid: false },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            email: true,
            minimumPayoutThreshold: true,
          },
        },
      },
    });
    
    // Group by agency
    const agencyTotals = {};
    
    unpaidPayouts.forEach(payout => {
      const agencyId = payout.agencyId;
      if (!agencyTotals[agencyId]) {
        agencyTotals[agencyId] = {
          agency: payout.agency,
          totalCommission: 0,
          months: 0,
        };
      }
      agencyTotals[agencyId].totalCommission += parseFloat(payout.commissionAmount);
      agencyTotals[agencyId].months += 1;
    });
    
    // Filter agencies below threshold
    return Object.values(agencyTotals)
      .filter(a => a.totalCommission < parseFloat(a.agency.minimumPayoutThreshold))
      .map(a => ({
        agencyId: a.agency.id,
        name: a.agency.name,
        email: a.agency.email,
        currentBalance: a.totalCommission.toFixed(2),
        threshold: parseFloat(a.agency.minimumPayoutThreshold).toFixed(2),
        monthsPending: a.months,
        amountNeeded: (parseFloat(a.agency.minimumPayoutThreshold) - a.totalCommission).toFixed(2),
      }));
  } catch (error) {
    console.error('Error getting agencies below threshold:', error);
    throw error;
  }
}

/**
 * Generate payout report with statistics
 */
export async function generatePayoutReport() {
  try {
    const [unpaidSummary, belowThreshold, totalStats] = await Promise.all([
      getUnpaidPayoutsSummary(),
      getAgenciesBelowThreshold(),
      prisma.partnerPayout.aggregate({
        _sum: {
          grossAmount: true,
          commissionAmount: true,
        },
        _count: true,
      }),
    ]);
    
    const paidStats = await prisma.partnerPayout.aggregate({
      where: { paid: true },
      _sum: {
        commissionAmount: true,
      },
    });
    
    return {
      readyToPay: {
        agencies: unpaidSummary.agencyCount,
        totalAmount: unpaidSummary.totalToPay,
        payouts: unpaidSummary.payouts,
      },
      belowThreshold: {
        count: belowThreshold.length,
        agencies: belowThreshold,
      },
      allTime: {
        totalGross: parseFloat(totalStats._sum.grossAmount || 0),
        totalCommission: parseFloat(totalStats._sum.commissionAmount || 0),
        totalPayouts: totalStats._count,
        paidOut: parseFloat(paidStats._sum.commissionAmount || 0),
      },
    };
  } catch (error) {
    console.error('Error generating payout report:', error);
    throw error;
  }
}
