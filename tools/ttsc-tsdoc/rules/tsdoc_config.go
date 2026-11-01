package tsdocedge

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.RegisterProject(tsdocConfigRule{})
}

const tsdocConfigRuleName = "tsdoc-edge/tsdoc-config"

var (
	_ rule.ProjectRule                 = tsdocConfigRule{}
	_ rule.ProjectInputRule            = tsdocConfigRule{}
	_ rule.ProjectInputObservationRule = tsdocConfigRule{}
	_ rule.HintRule                    = tsdocConfigRule{}
	_ rule.TypeAwareRule               = tsdocConfigRule{}
	_ rule.OptionsRule                 = tsdocConfigRule{}
)

// tsdocConfigRule loads and validates the workspace tsdoc.json once per Program
// cycle via ProjectInputReader, publishes the resolved tag table to file rules,
// and exposes JSDoc `@tag` completions to ttscserver via HintRule.
type tsdocConfigRule struct{}

type tsdocConfigOptions struct {
	ConfigPath string `json:"configPath"`
}

type tsdocJSONFile struct {
	NoStandardTags bool                  `json:"noStandardTags"`
	TagDefinitions []tsdocTagDefinition  `json:"tagDefinitions"`
}

type tsdocTagDefinition struct {
	TagName       string `json:"tagName"`
	SyntaxKind    string `json:"syntaxKind"`
	AllowMultiple bool   `json:"allowMultiple"`
}

type tsdocTagSpec struct {
	TagName    string
	SyntaxKind string
}

type tsdocConfigState struct {
	allowed map[string]string
	ordered []tsdocTagSpec
}

// standardTSDocTags mirrors @microsoft/tsdoc v0 StandardTags.allDefinitions.
var standardTSDocTags = []tsdocTagSpec{
	{TagName: "@alpha", SyntaxKind: "modifier"},
	{TagName: "@beta", SyntaxKind: "modifier"},
	{TagName: "@decorator", SyntaxKind: "block"},
	{TagName: "@defaultValue", SyntaxKind: "block"},
	{TagName: "@deprecated", SyntaxKind: "block"},
	{TagName: "@eventProperty", SyntaxKind: "modifier"},
	{TagName: "@example", SyntaxKind: "block"},
	{TagName: "@experimental", SyntaxKind: "modifier"},
	{TagName: "@inheritDoc", SyntaxKind: "inline"},
	{TagName: "@internal", SyntaxKind: "modifier"},
	{TagName: "@jsx", SyntaxKind: "block"},
	{TagName: "@jsxFrag", SyntaxKind: "block"},
	{TagName: "@jsxImportSource", SyntaxKind: "block"},
	{TagName: "@jsxRuntime", SyntaxKind: "block"},
	{TagName: "@label", SyntaxKind: "inline"},
	{TagName: "@link", SyntaxKind: "inline"},
	{TagName: "@override", SyntaxKind: "modifier"},
	{TagName: "@packageDocumentation", SyntaxKind: "modifier"},
	{TagName: "@param", SyntaxKind: "block"},
	{TagName: "@privateRemarks", SyntaxKind: "block"},
	{TagName: "@public", SyntaxKind: "modifier"},
	{TagName: "@readonly", SyntaxKind: "modifier"},
	{TagName: "@remarks", SyntaxKind: "block"},
	{TagName: "@returns", SyntaxKind: "block"},
	{TagName: "@sealed", SyntaxKind: "modifier"},
	{TagName: "@see", SyntaxKind: "block"},
	{TagName: "@throws", SyntaxKind: "block"},
	{TagName: "@typeParam", SyntaxKind: "block"},
	{TagName: "@virtual", SyntaxKind: "modifier"},
}

func (tsdocConfigRule) Name() string                   { return tsdocConfigRuleName }
func (tsdocConfigRule) NeedsTypeChecker() bool         { return false }
func (tsdocConfigRule) AcceptsTtscLintOptions() bool   { return true }
func (tsdocConfigRule) UsesProjectInputReader() bool   { return true }

func (tsdocConfigRule) ProjectInputs(ctx *rule.ProjectInputContext) []rule.ProjectInput {
	var opts tsdocConfigOptions
	_ = ctx.DecodeOptions(&opts)
	return []rule.ProjectInput{
		{
			Kind:    rule.ProjectInputFile,
			Pattern: resolveConfigPattern(opts.ConfigPath),
		},
	}
}

func (tsdocConfigRule) Check(ctx *rule.ProjectContext) {
	if ctx == nil {
		return
	}
	var opts tsdocConfigOptions
	if err := ctx.DecodeOptions(&opts); err != nil {
		ctx.Report("Invalid tsdoc-edge/tsdoc-config options: " + err.Error())
		return
	}

	configPath := resolveConfigFsPath(ctx.Identity, opts.ConfigPath)
	raw, err := readConfigBytes(ctx.Inputs, configPath)
	if err != nil {
		ctx.Report("Failed to read " + resolveConfigPattern(opts.ConfigPath) + ": " + err.Error())
		return
	}

	var parsed tsdocJSONFile
	if err := json.Unmarshal(raw, &parsed); err != nil {
		ctx.Report("Malformed " + resolveConfigPattern(opts.ConfigPath) + ": " + err.Error())
		return
	}

	allowed := make(map[string]string, len(standardTSDocTags)+len(parsed.TagDefinitions))
	if !parsed.NoStandardTags {
		for _, std := range standardTSDocTags {
			allowed[std.TagName] = std.SyntaxKind
		}
	}
	for _, def := range parsed.TagDefinitions {
		name := strings.TrimSpace(def.TagName)
		if name == "" || !strings.HasPrefix(name, "@") {
			ctx.Report("Invalid tagName " + strconvQuote(def.TagName) + " in " + resolveConfigPattern(opts.ConfigPath) + ": tag names must start with '@'.")
			return
		}
		kind := strings.TrimSpace(def.SyntaxKind)
		if kind == "" {
			kind = "block"
		}
		allowed[name] = kind
	}

	ordered := make([]tsdocTagSpec, 0, len(allowed))
	for name, kind := range allowed {
		ordered = append(ordered, tsdocTagSpec{TagName: name, SyntaxKind: kind})
	}
	sort.Slice(ordered, func(i, j int) bool {
		return ordered[i].TagName < ordered[j].TagName
	})

	ctx.SetState(&tsdocConfigState{
		allowed: allowed,
		ordered: ordered,
	})
}

func (tsdocConfigRule) Hints(ctx *rule.HintContext) []rule.Hint {
	if ctx == nil {
		return nil
	}
	state, ok := ctx.State.(*tsdocConfigState)
	if !ok || state == nil {
		return nil
	}
	hints := make([]rule.Hint, 0, len(state.ordered))
	for _, spec := range state.ordered {
		hints = append(hints, rule.Hint{
			Insert: strings.TrimPrefix(spec.TagName, "@"),
			Detail: "TSDoc " + spec.SyntaxKind + " tag",
			Trigger: rule.HintTrigger{
				Scope: rule.HintScopeJSDoc,
				After: "@",
			},
		})
	}
	return hints
}

func resolveConfigPattern(configured string) string {
	trimmed := strings.TrimSpace(configured)
	if trimmed == "" {
		return "tsdoc.json"
	}
	return trimmed
}

func resolveConfigFsPath(identity rule.ProjectIdentity, configured string) string {
	pattern := filepath.FromSlash(resolveConfigPattern(configured))
	if filepath.IsAbs(pattern) {
		return pattern
	}
	for _, root := range []string{
		identity.PhysicalProjectRoot,
		identity.LogicalProjectRoot,
		identity.InvocationCwd,
	} {
		if root != "" {
			return filepath.Join(root, pattern)
		}
	}
	return pattern
}

func readConfigBytes(inputs rule.ProjectInputReader, path string) ([]byte, error) {
	if inputs != nil {
		return inputs.ReadFile(path)
	}
	return os.ReadFile(path)
}

func strconvQuote(value string) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		return `"` + value + `"`
	}
	return string(encoded)
}
