import { z } from 'zod';
import { PolicyService } from '../../policy/policy.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

export function buildPolicyTools(
  policyService: PolicyService,
): ToolDefinition[] {
  return [
    {
      name: 'search_company_policies',
      description:
        'Search the company policy documents (uploaded by admins as PDFs — cancellation policy, refund policy, terms, etc.) for passages relevant to a question. Use this before answering any policy/terms/rules question, and cite the source document title in your answer.',
      schema: z.object({ query: z.string().min(1).max(500) }),
      mutating: false,
      execute: (_user, { query }) =>
        runToolSafely(async () => {
          const results = await policyService.search(query);
          if (results.length === 0) {
            return 'No policy documents have been uploaded yet, or none matched this question.';
          }
          return results
            .map((r) => `### ${r.documentTitle}\n${r.content}`)
            .join('\n\n');
        }),
    },
  ];
}
