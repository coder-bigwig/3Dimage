package com.medical3d.viewer.modules.annotation;

import com.medical3d.viewer.modules.annotation.dto.AnnotationDocument;
import com.medical3d.viewer.common.exception.DomainValidationException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class AnnotationDocumentTest {
    final ObjectMapper json = new ObjectMapper();
    final UUID layer = UUID.fromString("20000000-0000-0000-0000-000000000001");
    String payload = """
        {"version":0,"drawings":[{"id":"50000000-0000-0000-0000-000000000001","kind":"arrow","color":"#ff0000","points":[{"x":0.1,"y":0.2},{"x":0.8,"y":0.7}],"text":""}],
        "models":[{"id":"50000000-0000-0000-0000-000000000002","layerId":"20000000-0000-0000-0000-000000000001","position":[1,2,3],"text":"右上叶","offset":[60,-40]}]}
        """;
    @Test void roundTripsFrontendCoordinatesWithoutChangingAnchorOrOffset() {
        var document = json.readValue(payload, AnnotationDocument.class);
        document.validate(Set.of(layer));
        assertThat(json.readValue(json.writeValueAsString(document), AnnotationDocument.class)).isEqualTo(document);
        assertThat(document.models().get(0).position()).containsExactly(1.0, 2.0, 3.0);
        assertThat(document.models().get(0).offset()).containsExactly(60.0, -40.0);
    }
    @Test void rejectsForeignLayers() {
        assertThatThrownBy(() -> json.readValue(payload, AnnotationDocument.class).validate(Set.of()))
            .isInstanceOf(DomainValidationException.class);
    }
    @Test void rejectsOutOfRangeScreenCoordinates() {
        assertThatThrownBy(() -> json.readValue(payload.replace("0.8", "1.8"), AnnotationDocument.class).validate(Set.of(layer)))
            .isInstanceOf(DomainValidationException.class);
    }
    @Test void rejectsBlankModelLabels() {
        assertThatThrownBy(() -> json.readValue(payload.replace("右上叶", " "), AnnotationDocument.class).validate(Set.of(layer)))
            .isInstanceOf(DomainValidationException.class);
    }
}
