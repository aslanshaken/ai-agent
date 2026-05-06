import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

const GraphState = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

export function buildStubGraph(nodeTypes: string[]) {
  const graph = new StateGraph(GraphState);

  graph.addNode("collect", async () => ({
    messages: [`stub graph saw: ${nodeTypes.join(" → ")}`],
  }));

  // @ts-expect-error — `collect` is a registered node; LangGraph's generics omit it here.
  graph.addEdge(START, "collect");
  // @ts-expect-error — same as above.
  graph.addEdge("collect", END);

  return graph.compile();
}
