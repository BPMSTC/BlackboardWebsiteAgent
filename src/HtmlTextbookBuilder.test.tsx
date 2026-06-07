import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function getOutputPre(label: string) {
  return screen.getByLabelText(label);
}

describe("HTML Textbook Page Builder", () => {
  it("renders the Blackboard builder workflow instead of the old agent explainer", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "HTML Textbook Page Builder" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lesson intake" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generation controls" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lesson outline" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Blackboard HTML document" })).toBeInTheDocument();
  });

  it("updates generated Blackboard HTML from the intake form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Lesson topic"), "CSS Grid layout basics");
    await user.type(screen.getByLabelText("Course name"), "Web Design 1");
    await user.clear(screen.getByLabelText("Required concepts"));
    await user.type(
      screen.getByLabelText("Required concepts"),
      "Grid container{enter}Grid tracks{enter}Gap",
    );
    await user.type(
      screen.getByLabelText("Common student struggles"),
      "Students mix up rows and columns.",
    );

    const html = getOutputPre("Generated Blackboard HTML");
    expect(html).toHaveTextContent("<!DOCTYPE html>");
    expect(html).toHaveTextContent("<title>CSS Grid layout basics</title>");
    expect(html).toHaveTextContent("Web Design 1 lesson");
    expect(html).toHaveTextContent("Grid container");
    expect(html).toHaveTextContent("Students mix up rows and columns.");
    expect(html).toHaveTextContent("For More Information");
  });

  it("shows validation status and recommended scope", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("Lesson topic is still required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Lesson topic"), "Intro to JavaScript events");

    expect(screen.getByText("Single Blackboard page recommended.")).toBeInTheDocument();
    expect(screen.getByText("Topic and discipline are present.")).toBeInTheDocument();
    expect(screen.getByText("Full HTML document")).toBeInTheDocument();
    expect(screen.getByText("No assessment content")).toBeInTheDocument();
  });

  it("switches to intake JSON and copies the selected output", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<App />);

    await user.type(screen.getByLabelText("Lesson topic"), "Debugging JavaScript forms");
    await user.click(screen.getByRole("button", { name: "Intake JSON" }));
    await user.click(screen.getByRole("button", { name: "Copy output" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = JSON.parse(writeText.mock.calls[0][0]);
    expect(copied.lessonRequest.topic).toBe("Debugging JavaScript forms");
    expect(copied.output.target).toBe("blackboard_content_editor");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("adds an interactive section when the interactive template is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Style template"), "interactive_tutorial");

    const outline = screen.getByRole("heading", { name: "Lesson outline" }).closest(".preview-column");
    expect(outline).not.toBeNull();
    expect(within(outline as HTMLElement).getByText("Interactive exploration")).toBeInTheDocument();
  });

  it("applies a top preset and fills multiple form fields", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Test 3: Networking Subnetting/i }));

    expect(screen.getByLabelText("Lesson topic")).toHaveValue("IPv4 subnetting with CIDR");
    expect(screen.getByLabelText("Course name")).toHaveValue("Networking and Infrastructure Basics");
    expect(screen.getByLabelText("Course / discipline")).toHaveValue("Networking");
    expect(screen.getByLabelText("Page count preference")).toHaveValue("custom");
    expect(screen.getByLabelText("Custom page count")).toHaveValue("3");
  });
});
