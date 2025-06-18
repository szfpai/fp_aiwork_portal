import { computed, unref, useSlots } from "vue";
import { createContext } from "@vben-core/shadcn-ui";
import { isString, mergeWithArrayOverride, set } from "@vben-core/shared/utils";
import { useForm } from "vee-validate";
import { object } from "zod";
import { getDefaultsForSchema } from "zod-defaults";
export const [injectFormProps, provideFormProps] = createContext(
  "VbenFormProps"
);
export const [injectComponentRefMap, provideComponentRefMap] = createContext("ComponentRefMap");
export function useFormInitial(props) {
  const slots = useSlots();
  const initialValues = generateInitialValues();
  const form = useForm({
    ...Object.keys(initialValues)?.length ? { initialValues } : {}
  });
  const delegatedSlots = computed(() => {
    const resultSlots = [];
    for (const key of Object.keys(slots)) {
      if (key !== "default") {
        resultSlots.push(key);
      }
    }
    return resultSlots;
  });
  function generateInitialValues() {
    const initialValues2 = {};
    const zodObject = {};
    (unref(props).schema || []).forEach((item) => {
      if (Reflect.has(item, "defaultValue")) {
        set(initialValues2, item.fieldName, item.defaultValue);
      } else if (item.rules && !isString(item.rules)) {
        zodObject[item.fieldName] = item.rules;
      }
    });
    const schemaInitialValues = getDefaultsForSchema(object(zodObject));
    const zodDefaults = {};
    for (const key in schemaInitialValues) {
      set(zodDefaults, key, schemaInitialValues[key]);
    }
    return mergeWithArrayOverride(initialValues2, zodDefaults);
  }
  return {
    delegatedSlots,
    form
  };
}
