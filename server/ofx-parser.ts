interface OFXTransaction {
  fitId: string;
  date: Date;
  amount: number;
  description: string;
  type: 'receita' | 'despesa';
}

interface OFXParseResult {
  bankName: string;
  accountNumber: string;
  startDate: Date | null;
  endDate: Date | null;
  transactions: OFXTransaction[];
}

export function parseOFX(content: string): OFXParseResult {
  const result: OFXParseResult = {
    bankName: '',
    accountNumber: '',
    startDate: null,
    endDate: null,
    transactions: [],
  };

  // Extract bank info
  const orgMatch = content.match(/<ORG>([^<]+)/);
  if (orgMatch) result.bankName = orgMatch[1].trim();

  const acctIdMatch = content.match(/<ACCTID>([^<]+)/);
  if (acctIdMatch) result.accountNumber = acctIdMatch[1].trim();

  // Extract date range
  const dtStartMatch = content.match(/<DTSTART>([^<]+)/);
  if (dtStartMatch) result.startDate = parseOFXDate(dtStartMatch[1]);

  const dtEndMatch = content.match(/<DTEND>([^<]+)/);
  if (dtEndMatch) result.endDate = parseOFXDate(dtEndMatch[1]);

  // Extract transactions
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trnContent = match[1];
    
    const fitIdMatch = trnContent.match(/<FITID>([^<\n]+)/);
    const dtPostedMatch = trnContent.match(/<DTPOSTED>([^<\n]+)/);
    const trnAmtMatch = trnContent.match(/<TRNAMT>([^<\n]+)/);
    const memoMatch = trnContent.match(/<MEMO>([^<\n]+)/);
    const nameMatch = trnContent.match(/<NAME>([^<\n]+)/);

    if (dtPostedMatch && trnAmtMatch) {
      const amount = parseFloat(trnAmtMatch[1].trim().replace(',', '.'));
      const description = (memoMatch?.[1] || nameMatch?.[1] || 'Sem descrição').trim();
      
      result.transactions.push({
        fitId: fitIdMatch?.[1]?.trim() || `auto-${Date.now()}-${Math.random()}`,
        date: parseOFXDate(dtPostedMatch[1]) || new Date(),
        amount: Math.abs(amount),
        description,
        type: amount >= 0 ? 'receita' : 'despesa',
      });
    }
  }

  return result;
}

function parseOFXDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
  const cleaned = dateStr.trim().replace(/\[.*\]/, '');
  
  if (cleaned.length >= 8) {
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    
    return new Date(year, month, day);
  }
  
  return null;
}

export function classifyTransaction(
  description: string,
  categories: Array<{ id: string; name: string; type: string; keywords: string | null }>
): { categoryId: string | null; categoryName: string | null } {
  const descLower = description.toLowerCase();
  
  for (const category of categories) {
    if (!category.keywords) continue;
    
    const keywords = category.keywords.split(',').map(k => k.trim().toLowerCase());
    
    for (const keyword of keywords) {
      if (keyword && descLower.includes(keyword)) {
        return { categoryId: category.id, categoryName: category.name };
      }
    }
  }
  
  return { categoryId: null, categoryName: null };
}
