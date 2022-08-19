import { BaseHelper } from 'src/app/common/base.helper';
import { BillingSummary } from 'src/app/common/billing-summary';

export class FetcherHelper extends BaseHelper {
  constructor(tabId: number) {
    super(tabId);
  }

  async getBillingListByTableElem({
    tableElem,
    billingIdColumn,
    summaryTextColumn,
    totalPriceTextColumn,
    linkUrlColumn,
    currencyCode,
  }: {
    tableElem: string | Element;
    billingIdColumn: string | ((row: Element) => string | null) | number;
    summaryTextColumn: string | ((row: Element) => string | null) | number;
    totalPriceTextColumn: string | ((row: Element) => string | null) | number;
    linkUrlColumn?: string | ((row: Element) => string | null) | number;
    currencyCode?: string | 'JPY' | 'USD';
  }): Promise<BillingSummary[]> {
    const document = await this.getDocument();

    const elem =
      typeof tableElem === 'string'
        ? document.querySelector(tableElem)
        : tableElem;
    if (!elem) throw new Error('Could not find the table element.');

    // Find columns
    const columnNumbers: { [key: string]: number | null } = {
      billingId: typeof billingIdColumn === 'number' ? billingIdColumn : null,
      summaryText:
        typeof summaryTextColumn === 'number' ? summaryTextColumn : null,
      totalPrice:
        typeof totalPriceTextColumn === 'number' ? totalPriceTextColumn : null,
      linkUrl: typeof linkUrlColumn === 'number' ? linkUrlColumn : null,
    };
    const tableRows = Array.from(elem.querySelectorAll('tr'));
    const columnsOfFirstRow = Array.from(tableRows[0].querySelectorAll('th'));

    for (let i = 0; i < columnsOfFirstRow.length; i++) {
      const column = columnsOfFirstRow[i];
      const text = column.textContent;
      if (!text) continue;

      if (
        typeof billingIdColumn === 'string' &&
        !columnNumbers['billingId'] &&
        text.indexOf(billingIdColumn) !== -1
      ) {
        columnNumbers['billingId'] = i;
        continue;
      }

      if (
        typeof summaryTextColumn === 'string' &&
        !columnNumbers['summaryText'] &&
        text.indexOf(summaryTextColumn) !== -1
      ) {
        columnNumbers['summaryText'] = i;
        continue;
      }

      if (
        typeof totalPriceTextColumn === 'string' &&
        !columnNumbers['totalPrice'] &&
        text.indexOf(totalPriceTextColumn) !== -1
      ) {
        columnNumbers['totalPrice'] = i;
        continue;
      }

      if (
        typeof linkUrlColumn === 'string' &&
        !columnNumbers['linkUrl'] &&
        text.indexOf(linkUrlColumn) !== -1
      ) {
        columnNumbers['linkUrl'] = i;
        continue;
      }
    }

    console.log(
      `[FetcherHelper] getBillingListByTableElem - columnNumbers = `,
      columnNumbers
    );

    // Check columns
    if (
      typeof billingIdColumn !== 'function' &&
      columnNumbers['billingId'] === null
    )
      throw new Error('Could not detected billingId column.');

    if (
      typeof summaryTextColumn !== 'function' &&
      columnNumbers['summaryText'] === null
    )
      throw new Error('Could not detected summaryText column.');

    if (
      typeof totalPriceTextColumn !== 'function' &&
      columnNumbers['totalPrice'] === null
    )
      throw new Error('Could not detected totalPrice column.');

    // Get column values
    const billingList: BillingSummary[] = [];
    for (let i = 1; i < tableRows.length; i++) {
      const row = tableRows[i];
      const cells = Array.from(row.querySelectorAll('td'));

      // Get column value - Billing ID
      let billingId = null;
      if (typeof billingIdColumn === 'function') {
        billingId = billingIdColumn(row);
      } else if (columnNumbers['billingId'] != null) {
        billingId = cells[columnNumbers['billingId']]?.textContent;
      }

      if (!billingId) {
        console.warn('Could not detected billingId from this row...', row);
        continue;
      }

      // Get column value Summary Price
      let summaryText = null;
      if (typeof summaryTextColumn === 'function') {
        summaryText = summaryTextColumn(row);
      } else if (columnNumbers['summaryText'] != null) {
        summaryText = cells[columnNumbers['summaryText']].textContent
          ?.replace(/(\n|\r)/g, '')
          ?.trim();
      }

      // Get column value Total Price
      let totalPrice = null;
      if (typeof totalPriceTextColumn === 'function') {
        totalPrice = totalPriceTextColumn(row);
      } else if (columnNumbers['totalPrice'] != null) {
        totalPrice = cells[columnNumbers['totalPrice']].textContent?.trim();
      }
      if (totalPrice === null || totalPrice === undefined) {
        continue;
      }

      if (!currencyCode) {
        if (totalPrice.match(/(\$|USD)/)) {
          currencyCode = 'USD';
        } else if (totalPrice.match(/(¥|￥|JPY)/)) {
          currencyCode = 'JPY';
        }
      }

      if (totalPrice.indexOf('.')) {
        totalPrice = parseFloat(totalPrice.replace(/[^0-9\.]/g, ''));
      } else {
        totalPrice = parseInt(totalPrice.replace(/[^0-9]/g, ''), 10);
      }

      if (isNaN(totalPrice)) {
        console.warn('Could not detected totalPrice from this row...', row);
        continue;
      }

      // Get column value Total Price
      let linkUrl = undefined;
      if (typeof linkUrlColumn === 'function') {
        linkUrl = linkUrlColumn(row);
      } else if (columnNumbers['linkUrl'] != null) {
        if (cells[columnNumbers['linkUrl']]) {
          linkUrl = cells[columnNumbers['linkUrl']]
            .querySelector('a')
            ?.getAttribute('href');
        }
      }

      // Push to array
      billingList.push({
        id: billingId,
        summaryText: summaryText || 'N/A',
        totalPrice: totalPrice,
        priceCurrency: currencyCode,
        linkUrl: linkUrl !== null ? linkUrl : undefined,
      });
    }

    return billingList;
  }
}
