import { PageHeader } from '@/components/ui/PageHeader'

export default function TermsPage() {
  return (
    <div className="pb-12">
      <PageHeader title="Terms &amp; Conditions" backHref="back" />
      <div className="px-4">
      <div className="mb-6">
        <p className="text-gray-400 text-sm">Voltura Power Group — Colorado Springs, CO</p>
      </div>

      <div className="space-y-6 text-sm text-white/80 leading-relaxed">

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">1. Scope of Work</h2>
          <p>
            All services are limited to the scope described in the signed estimate or proposal. Voltura Power Group
            will not perform additional work beyond the agreed scope without a written and signed change order.
            Verbal agreements or on-site requests do not constitute an authorization to proceed.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">2. Pricing &amp; Payment</h2>
          <p>
            Quotes are valid for 30 days from the date of issue. Payment is due in full upon completion of work
            unless otherwise agreed in writing. Accepted forms of payment: cash, check, Zelle, and credit/debit card.
            Credit and debit card payments are subject to a 3% processing fee. Returned checks are subject to a $35
            fee plus any bank charges incurred. Voltura Power Group reserves the right to require a deposit before
            scheduling work on larger projects.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">3. Change Orders</h2>
          <p>
            Any change to the agreed scope of work — including additions, deletions, or modifications — requires a
            signed change order with updated pricing before work on the change proceeds. Customer agrees that change
            orders may affect the project timeline. Voltura Power Group is not liable for delays caused by unsigned
            or unapproved changes.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">4. Permits</h2>
          <p>
            Where electrical permits are required by the City of Colorado Springs or El Paso County, Voltura Power
            Group will obtain them on behalf of the customer. Permit fees will be itemized in the estimate if applicable.
            Customer is responsible for ensuring site access is available for all required inspections. Delays caused
            by failed or missed inspections due to inaccessible or unsafe site conditions are the customer's
            responsibility.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">5. Warranty</h2>
          <p>
            Voltura Power Group warrants all labor for 12 months from the date of job completion. This warranty covers
            defects in workmanship only. Equipment, fixtures, and materials are covered by the respective manufacturer's
            warranty. The labor warranty is void if the completed work is altered, modified, or repaired by any party
            other than Voltura Power Group without prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">6. Drywall &amp; Wall Repairs</h2>
          <p>
            When electrical work requires opening walls, ceilings, or floors, Voltura Power Group will patch all
            penetrations made by our crew using standard drywall compound and tape techniques. We do not guarantee
            an exact cosmetic match to existing textures, paint color, sheen, or finish. Seamless paint blending or
            full wall repainting may require a separate drywall or painting contractor and is not included in
            electrical work unless specifically quoted. Drywall patching and painting services, when included in the
            estimate, are subject to these same limitations.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">7. Site Access &amp; Conditions</h2>
          <p>
            Customer must provide safe, unobstructed access to all work areas, electrical panels, attic spaces, and
            crawlspaces required for the job. If site conditions are determined to be unsafe — including but not
            limited to the presence of asbestos, mold, structural instability, or undisclosed hazardous materials —
            Voltura Power Group reserves the right to stop work immediately until conditions are corrected at the
            customer's expense. A trip charge may apply for any return visit required as a result.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">8. Existing Conditions</h2>
          <p>
            Voltura Power Group is not responsible for pre-existing electrical defects, code violations, deteriorated
            wiring, or hidden conditions discovered during the course of work. If unforeseen conditions require
            additional labor or materials to complete the job safely and to code, a change order will be issued before
            proceeding. Customer acknowledges that older homes may have conditions that increase the scope of work.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">9. Late Payment</h2>
          <p>
            Invoices unpaid after 30 days from the due date are subject to a finance charge of 1.5% per month
            (18% annually) on the outstanding balance. Customer agrees to pay all reasonable costs of collection,
            including attorney fees, court costs, and collection agency fees, in the event of non-payment.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">10. Cancellations &amp; No-Shows</h2>
          <p>
            Cancellations made with less than 24 hours notice prior to a scheduled appointment may be subject to
            a dispatch/trip fee of up to $85. Materials ordered specifically for a customer's project that cannot
            be returned to suppliers are non-refundable. If a customer is not present at the scheduled time and
            work cannot proceed, a trip charge will apply for any return visit.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">11. Limitation of Liability</h2>
          <p>
            Voltura Power Group's total liability arising from any claim related to services performed shall not
            exceed the total amount paid by the customer under the applicable contract. Voltura Power Group shall
            not be liable for any indirect, consequential, incidental, punitive, or special damages, including but
            not limited to loss of use, loss of income, or property damage beyond the immediate work area, arising
            from any cause whatsoever.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">12. Dispute Resolution</h2>
          <p>
            In the event of a dispute, both parties agree to first attempt resolution through good-faith negotiation.
            If negotiation fails, disputes shall be submitted to mediation before any legal action is initiated.
            Mediation costs shall be split equally between the parties. This agreement shall be governed by the
            laws of the State of Colorado. Venue for any legal proceedings shall be in El Paso County, Colorado.
          </p>
        </section>

        <section>
          <h2 className="text-volturaGold font-bold text-base mb-2">13. Entire Agreement</h2>
          <p>
            These terms, together with the signed estimate or proposal, constitute the entire agreement between
            Voltura Power Group and the customer. No prior representations, warranties, or promises not contained
            herein shall be binding. If any provision of these terms is found to be unenforceable, the remaining
            provisions shall remain in full force and effect.
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-white/10 text-gray-500 text-xs space-y-1">
          <p>Voltura Power Group · Colorado Springs, CO · License #EC.0202116</p>
          <p>Questions? Contact us at volturapower.energy or (719) 440-4528</p>
          <p>Last updated: April 2026</p>
        </div>
      </div>
      </div>
    </div>
  )
}
